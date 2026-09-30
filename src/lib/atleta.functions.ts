import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MinhaConta = {
  nome: string;
  email: string;
  whatsapp: string;
  dojo: { nome: string; sensei: string; cidade: string; uf: string } | null;
  filiacao: { status: string; provedor: string; ativada_em: string | null } | null;
};

const contaInput = z
  .object({
    nome: z.string().trim().min(3).max(120),
    whatsapp: z.string().trim().min(10).max(20),
    email: z.string().trim().email().max(160),
    email_confirmacao: z.string().trim().email().max(160),
    data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    senha: z.string().min(8).max(72),
    sensei_id: z.string().uuid(),
    aceite_termos: z.literal(true),
    aceite_lgpd: z.literal(true),
    aceite_ranking: z.literal(true),
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

    const { data: dojo } = await supabaseAdmin
      .from("senseis")
      .select("id, status")
      .eq("id", data.sensei_id)
      .maybeSingle();
    if (!dojo || dojo.status !== "ativo") {
      throw new Error("Este dojô não está mais aberto para inscrições.");
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
      aceite_termos: true,
      aceite_lgpd: true,
      aceite_ranking: true,
      aceites_em: new Date().toISOString(),
    });
    if (perfil.error) {
      console.error("criarContaAtleta perfil", perfil.error);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não conseguimos criar sua conta. Tente novamente em instantes.");
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "atleta" as const },
      { onConflict: "user_id,role" },
    );

    await supabaseAdmin.from("atleta_dojos").insert({
      atleta_id: userId,
      sensei_id: data.sensei_id,
      origem: "cadastro",
    });

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
      .select("nome, email, whatsapp")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil) return null;

    const { data: vinculo } = await context.supabase
      .from("atleta_dojos")
      .select("sensei_id")
      .eq("atleta_id", context.userId)
      .is("ate", null)
      .maybeSingle();

    let dojo: MinhaConta["dojo"] = null;
    if (vinculo?.sensei_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: s } = await supabaseAdmin
        .from("senseis")
        .select("nome, dojo, cidade, uf")
        .eq("id", vinculo.sensei_id)
        .maybeSingle();
      if (s) dojo = { nome: s.dojo, sensei: s.nome, cidade: s.cidade, uf: s.uf };
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
      dojo,
      filiacao: fil ?? null,
    };
  });
