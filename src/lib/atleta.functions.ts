import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FAIXAS } from "@/lib/faixas";

export type MinhaConta = {
  nome: string;
  email: string;
  whatsapp: string;
  faixa: string | null;
  clube: {
    id: string;
    slug: string;
    nome: string;
    responsavel: string;
    cidade: string;
    uf: string;
    piloto: boolean;
    whatsapp_responsavel: string;
  } | null;
  unidade: {
    nome: string;
    endereco: string | null;
    dia_aula: number | null;
    horario_aula: string | null;
    duracao_minutos: number;
  } | null;
  vinculo: {
    id: string;
    status_autorizacao: string;
    solicitado_em: string;
    recusa_motivo: string | null;
  } | null;
  filiacao: { status: string; provedor: string; ativada_em: string | null } | null;
};

const contaInput = z
  .object({
    nome: z.string().trim().min(3).max(120),
    whatsapp: z.string().trim().min(10).max(20),
    email: z.string().trim().email().max(160),
    email_confirmacao: z.string().trim().email().max(160),
    data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    faixa: z.enum(FAIXAS),
    senha: z.string().min(8).max(72),
    unidade_id: z.string().uuid(),
    aceite_termos: z.literal(true),
    aceite_lgpd: z.literal(true),
    aceite_ranking: z.literal(true),
    aceite_marketing_eventos: z.boolean().optional().default(false),
    /** Campo oculto anti-robô: precisa chegar vazio. */
    isca: z.string().max(200).optional().default(""),
    /** Milissegundos que o formulário ficou aberto. */
    duracao_ms: z.number().int().nonnegative(),
  })
  .refine((v) => v.email.toLowerCase() === v.email_confirmacao.toLowerCase(), {
    message: "Os emails digitados não são iguais.",
  });

function idade(nascimento: string) {
  const n = new Date(`${nascimento}T00:00:00`);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  const m = hoje.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) anos--;
  return anos;
}

export const criarContaAtleta = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contaInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    if (data.isca.trim() !== "" || data.duracao_ms < 3000) {
      throw new Error("Não conseguimos validar o envio. Recarregue a página e tente de novo.");
    }

    const anos = idade(data.data_nascimento);
    if (Number.isNaN(anos) || anos < 0 || anos > 110) {
      throw new Error("Informe uma data de nascimento válida.");
    }
    if (anos < 18) {
      throw new Error(
        "Por enquanto a World League aceita apenas atletas maiores de 18 anos. Obrigado pelo interesse — sua hora vai chegar.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const [{ data: unidade }, { data: cfg }] = await Promise.all([
      supabaseAdmin
        .from("unidades")
        .select("id, clube_id, ativa")
        .eq("id", data.unidade_id)
        .maybeSingle(),
      supabaseAdmin.from("config").select("chave, valor"),
    ]);

    const valor = (chave: string) => (cfg ?? []).find((c) => c.chave === chave)?.valor;
    if (valor("inscricoes_abertas") === "false") {
      throw new Error("As inscrições da liga estão fechadas neste momento.");
    }
    if (!unidade || !unidade.ativa) {
      throw new Error("Esta unidade não está aberta para novos atletas.");
    }

    const { data: clube } = await supabaseAdmin
      .from("senseis")
      .select("id, piloto, link_publico_ativo")
      .eq("id", unidade.clube_id)
      .maybeSingle();

    if (!clube || !clube.link_publico_ativo) {
      throw new Error("Este clube não está aberto para novos atletas.");
    }
    if (valor("modo_piloto") === "true" && !clube.piloto) {
      throw new Error("Este clube ainda não está participando do piloto da liga.");
    }

    const { data: jaExiste } = await supabaseAdmin
      .from("atletas")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (jaExiste) {
      throw new Error("Já existe uma conta com este email. Entre com sua senha.");
    }

    const criado = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
    });
    const userId = criado.data.user?.id;
    if (!userId) {
      const motivo = criado.error?.message ?? "";
      throw new Error(
        motivo.includes("already")
          ? "Já existe uma conta com este email. Entre com sua senha."
          : /weak|password/i.test(motivo)
            ? "Escolha uma senha mais forte: misture letras, números e símbolos."
            : "Não conseguimos criar sua conta. Tente novamente em instantes.",
      );
    }

    const perfil = await supabaseAdmin.from("atletas").insert({
      id: userId,
      nome: data.nome,
      email,
      whatsapp: data.whatsapp,
      data_nascimento: data.data_nascimento,
      faixa: data.faixa,
      aceite_termos: true,
      aceite_lgpd: true,
      aceite_ranking: true,
      aceite_marketing_eventos: data.aceite_marketing_eventos,
      aceites_em: new Date().toISOString(),
    });
    if (perfil.error) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não conseguimos criar sua conta. Tente novamente em instantes.");
    }

    // Se qualquer gravação falhar, desfazemos tudo para não deixar conta pela metade.
    async function desfazer(): Promise<never> {
      await supabaseAdmin.from("atleta_dojos").delete().eq("atleta_id", userId!);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId!);
      await supabaseAdmin.from("atletas").delete().eq("id", userId!);
      await supabaseAdmin.auth.admin.deleteUser(userId!);
      throw new Error("Não conseguimos criar sua conta. Tente novamente em instantes.");
    }

    const papel = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "atleta" as const },
      { onConflict: "user_id,role" },
    );
    if (papel.error) await desfazer();

    // Pedido de entrada no clube: fica pendente até o sensei autorizar.
    const pedido = await supabaseAdmin.from("atleta_dojos").insert({
      atleta_id: userId,
      sensei_id: unidade.clube_id,
      unidade_id: unidade.id,
      origem: "cadastro",
      status_autorizacao: "pendente",
    });
    if (pedido.error) await desfazer();

    // Contato de marketing com o mesmo email passa a apontar para a conta.
    await supabaseAdmin
      .from("leads_atletas")
      .update({ atleta_id: userId })
      .eq("email", email)
      .is("atleta_id", null);

    return { ok: true };
  });

export const getMinhaConta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MinhaConta | null> => {
    const { data: perfil } = await context.supabase
      .from("atletas")
      .select("nome, email, whatsapp, faixa")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil) return null;

    const { data: vinculo } = await context.supabase
      .from("atleta_dojos")
      .select("id, sensei_id, unidade_id, status_autorizacao, solicitado_em, recusa_motivo")
      .eq("atleta_id", context.userId)
      .is("ate", null)
      .maybeSingle();

    let clube: MinhaConta["clube"] = null;
    let unidade: MinhaConta["unidade"] = null;

    if (vinculo?.sensei_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: s }, { data: u }] = await Promise.all([
        supabaseAdmin
          .from("senseis")
          .select("id, slug, nome, dojo, cidade, uf, piloto, whatsapp")
          .eq("id", vinculo.sensei_id)
          .maybeSingle(),
        vinculo.unidade_id
          ? supabaseAdmin
              .from("unidades")
              .select("nome, endereco, dia_aula, horario_aula, duracao_minutos")
              .eq("id", vinculo.unidade_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (s) {
        clube = {
          id: s.id,
          slug: s.slug,
          nome: s.dojo,
          responsavel: s.nome,
          cidade: s.cidade,
          uf: s.uf,
          piloto: s.piloto,
          whatsapp_responsavel: s.whatsapp,
        };
      }
      if (u) {
        unidade = {
          nome: u.nome,
          endereco: u.endereco,
          dia_aula: u.dia_aula,
          horario_aula: u.horario_aula,
          duracao_minutos: u.duracao_minutos,
        };
      }
    }

    const { data: fil } = await context.supabase
      .from("filiacoes")
      .select("status, provedor, ativada_em")
      .eq("atleta_id", context.userId)
      .eq("tipo", "atleta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      nome: perfil.nome,
      email: perfil.email,
      whatsapp: perfil.whatsapp,
      faixa: perfil.faixa,
      clube,
      unidade,
      vinculo: vinculo
        ? {
            id: vinculo.id,
            status_autorizacao: vinculo.status_autorizacao,
            solicitado_em: vinculo.solicitado_em,
            recusa_motivo: vinculo.recusa_motivo,
          }
        : null,
      filiacao: fil ?? null,
    };
  });

/** Enquanto o pedido está pendente, o atleta pode desistir e pedir entrada em outro clube. */
export const cancelarMeuPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { data: vinculo } = await context.supabase
      .from("atleta_dojos")
      .select("id, status_autorizacao")
      .eq("atleta_id", context.userId)
      .is("ate", null)
      .maybeSingle();

    if (!vinculo) throw new Error("Você não tem pedido em aberto.");
    if (vinculo.status_autorizacao !== "pendente") {
      throw new Error("Seu pedido já foi decidido pelo clube. Fale com a liga para trocar.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("atleta_dojos")
      .update({ ate: new Date().toISOString().slice(0, 10) })
      .eq("id", vinculo.id);
    if (error) throw new Error("Não conseguimos cancelar o pedido agora.");
    return { ok: true };
  });

/** Pedido de entrada em um clube para quem já tem conta e está sem vínculo aberto. */
export const pedirEntradaNoClube = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ unidade_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: aberto } = await context.supabase
      .from("atleta_dojos")
      .select("id")
      .eq("atleta_id", context.userId)
      .is("ate", null)
      .maybeSingle();
    if (aberto) {
      throw new Error("Você já tem um pedido ou vínculo em aberto. Cancele antes de pedir outro.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: unidade }, { data: cfg }] = await Promise.all([
      supabaseAdmin
        .from("unidades")
        .select("id, clube_id, ativa")
        .eq("id", data.unidade_id)
        .maybeSingle(),
      supabaseAdmin.from("config").select("chave, valor"),
    ]);

    const valor = (chave: string) => (cfg ?? []).find((c) => c.chave === chave)?.valor;
    if (valor("inscricoes_abertas") === "false") {
      throw new Error("As inscrições da liga estão fechadas neste momento.");
    }
    if (!unidade?.ativa) throw new Error("Esta unidade não está aberta para novos atletas.");

    const { data: clube } = await supabaseAdmin
      .from("senseis")
      .select("piloto, link_publico_ativo")
      .eq("id", unidade.clube_id)
      .maybeSingle();
    if (!clube?.link_publico_ativo) throw new Error("Este clube não está aberto para novos atletas.");
    if (valor("modo_piloto") === "true" && !clube.piloto) {
      throw new Error("Este clube ainda não está participando do piloto da liga.");
    }

    // Depois de uma recusa, o atleta só pode pedir de novo ao mesmo clube após o prazo configurado.
    const bruto = Number(valor("bloqueio_recusa_dias"));
    const bloqueio = Number.isFinite(bruto) && bruto >= 0 ? bruto : 30;
    if (bloqueio > 0) {
      const limite = new Date(Date.now() - bloqueio * 86_400_000).toISOString();
      const { data: recusa } = await supabaseAdmin
        .from("atleta_dojos")
        .select("id")
        .eq("atleta_id", context.userId)
        .eq("sensei_id", unidade.clube_id)
        .eq("status_autorizacao", "recusado")
        .gte("solicitado_em", limite)
        .limit(1)
        .maybeSingle();
      if (recusa) {
        throw new Error(
          `Este clube recusou seu pedido há menos de ${bloqueio} dias. Escolha outro clube ou tente de novo depois desse prazo.`,
        );
      }
    }

    const { error } = await supabaseAdmin.from("atleta_dojos").insert({
      atleta_id: context.userId,
      sensei_id: unidade.clube_id,
      unidade_id: unidade.id,
      origem: "pedido",
      status_autorizacao: "pendente",
    });
    if (error) throw new Error("Não conseguimos registrar seu pedido agora.");
    return { ok: true };
  });

const perfilInput = z.object({
  nome: z.string().trim().min(3).max(120),
  whatsapp: z.string().trim().min(10).max(20),
  faixa: z.enum(FAIXAS),
  aceite_marketing_eventos: z.boolean(),
});

/**
 * Única porta de edição do perfil pelo próprio atleta. A lista de campos é fechada:
 * data de nascimento, email e os aceites obrigatórios só mudam pelo admin.
 */
export const atualizarMeuPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => perfilInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("atletas")
      .update({
        nome: data.nome,
        whatsapp: data.whatsapp,
        faixa: data.faixa,
        aceite_marketing_eventos: data.aceite_marketing_eventos,
      })
      .eq("id", context.userId);
    if (error) throw new Error("Não conseguimos salvar seus dados agora.");
    return { ok: true };
  });
