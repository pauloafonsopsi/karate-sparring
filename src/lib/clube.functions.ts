import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FILIACAO_LIGA_PADRAO_CENTAVOS } from "@/lib/preco";

/* ============================ Tipos ============================ */

export type UnidadePublica = {
  id: string;
  nome: string;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  fuso_horario: string;
  dia_aula: number | null;
  horario_aula: string | null;
  duracao_minutos: number;
};

export type ClubePublico = {
  id: string;
  slug: string;
  clube: string;
  responsavel: string;
  cidade: string;
  uf: string;
  graduacao: string | null;
  foto_url: string | null;
  piloto: boolean;
  mensalidade_centavos: number | null;
  filiacao_liga_centavos: number;
  inscricoes_abertas: boolean;
  unidades: UnidadePublica[];
};

export type ClubeDaVitrine = {
  id: string;
  slug: string;
  clube: string;
  responsavel: string;
  cidade: string;
  uf: string;
  graduacao: string | null;
  foto_url: string | null;
  piloto: boolean;
  mensalidade_centavos: number | null;
  filiacao_liga_centavos: number;
};

export type MeuClube = {
  id: string;
  slug: string;
  clube: string;
  responsavel: string;
  cidade: string;
  uf: string;
  status: string;
  piloto: boolean;
  recebedor_status: string;
  anuidade_status: string;
  link_publico_ativo: boolean;
  mensalidade_centavos: number | null;
  mensalidade_minima_centavos: number;
  mensalidade_sugerida_centavos: number;
  filiacao_liga_centavos: number;
  raio_metros: number;
  onboarding_concluido: boolean;
  unidades: (UnidadePublica & { is_sede: boolean; raio_metros: number; ativa: boolean })[];
};

export type AtletaDoClube = {
  vinculo_id: string;
  atleta_id: string;
  nome: string;
  whatsapp: string;
  faixa: string | null;
  unidade_id: string | null;
  unidade: string | null;
  status_autorizacao: string;
  solicitado_em: string;
  horas_esperando: number;
  filiacao: string;
};

/* ============================ Config ============================ */

async function lerConfig(
  admin: { from: (t: "config") => { select: (c: string) => Promise<{ data: { chave: string; valor: string | null }[] | null }> } },
) {
  const { data } = await admin.from("config").select("chave, valor");
  const map = new Map((data ?? []).map((r) => [r.chave, r.valor]));
  const num = (chave: string, padrao: number) => {
    const v = Number(map.get(chave));
    return Number.isFinite(v) && v > 0 ? v : padrao;
  };
  return {
    inscricoes_abertas: map.get("inscricoes_abertas") !== "false",
    modo_piloto: map.get("modo_piloto") !== "false",
    filiacao_liga_centavos: num("filiacao_liga_centavos", FILIACAO_LIGA_PADRAO_CENTAVOS),
    mensalidade_minima_centavos: num("mensalidade_minima_centavos", 3000),
    mensalidade_sugerida_centavos: num("mensalidade_sugerida_centavos", 12000),
  };
}

/* ======================= Páginas públicas ======================= */

export const listarClubesPublicos = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClubeDaVitrine[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await lerConfig(supabaseAdmin as never);

    const { data } = await supabaseAdmin
      .from("senseis")
      .select(
        "id, slug, dojo, nome, cidade, uf, graduacao, foto_url, piloto, mensalidade_centavos, link_publico_ativo",
      )
      .eq("link_publico_ativo", true)
      .order("uf");

    return (data ?? [])
      .filter((c) => (cfg.modo_piloto ? c.piloto : true))
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        clube: c.dojo,
        responsavel: c.nome,
        cidade: c.cidade,
        uf: c.uf,
        graduacao: c.graduacao,
        foto_url: c.foto_url,
        piloto: c.piloto,
        mensalidade_centavos: c.mensalidade_centavos,
        filiacao_liga_centavos: cfg.filiacao_liga_centavos,
      }));
  },
);

export const getClubePublico = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().trim().min(1).max(160) }).parse(data))
  .handler(async ({ data }): Promise<ClubePublico | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await lerConfig(supabaseAdmin as never);

    const { data: c } = await supabaseAdmin
      .from("senseis")
      .select(
        "id, slug, dojo, nome, cidade, uf, graduacao, foto_url, piloto, mensalidade_centavos, link_publico_ativo",
      )
      .eq("slug", data.slug)
      .maybeSingle();

    if (!c || !c.link_publico_ativo) return null;
    if (cfg.modo_piloto && !c.piloto) return null;

    const { data: unidades } = await supabaseAdmin
      .from("unidades")
      .select(
        "id, nome, endereco, latitude, longitude, fuso_horario, dia_aula, horario_aula, duracao_minutos, is_sede",
      )
      .eq("clube_id", c.id)
      .eq("ativa", true)
      .order("is_sede", { ascending: false });

    return {
      id: c.id,
      slug: c.slug,
      clube: c.dojo,
      responsavel: c.nome,
      cidade: c.cidade,
      uf: c.uf,
      graduacao: c.graduacao,
      foto_url: c.foto_url,
      piloto: c.piloto,
      mensalidade_centavos: c.mensalidade_centavos,
      filiacao_liga_centavos: cfg.filiacao_liga_centavos,
      inscricoes_abertas: cfg.inscricoes_abertas,
      unidades: (unidades ?? []).map((u) => ({
        id: u.id,
        nome: u.nome,
        endereco: u.endereco,
        latitude: u.latitude,
        longitude: u.longitude,
        fuso_horario: u.fuso_horario,
        dia_aula: u.dia_aula,
        horario_aula: u.horario_aula,
        duracao_minutos: u.duracao_minutos,
      })),
    };
  });

/* ===================== Área do clube (sensei) ===================== */

async function clubeIdDoUsuario(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("sensei_users")
    .select("sensei_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.sensei_id as string | undefined) ?? null;
}

export const getMeuClube = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeuClube | null> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await lerConfig(supabaseAdmin as never);

    const { data: c } = await context.supabase
      .from("senseis")
      .select(
        "id, slug, dojo, nome, cidade, uf, status, piloto, recebedor_status, anuidade_status, link_publico_ativo, mensalidade_centavos, raio_metros, onboarding_concluido",
      )
      .eq("id", clubeId)
      .maybeSingle();
    if (!c) return null;

    const { data: unidades } = await context.supabase
      .from("unidades")
      .select(
        "id, nome, is_sede, ativa, endereco, latitude, longitude, raio_metros, fuso_horario, dia_aula, horario_aula, duracao_minutos",
      )
      .eq("clube_id", clubeId)
      .order("is_sede", { ascending: false });

    return {
      id: c.id,
      slug: c.slug,
      clube: c.dojo,
      responsavel: c.nome,
      cidade: c.cidade,
      uf: c.uf,
      status: c.status,
      piloto: c.piloto,
      recebedor_status: c.recebedor_status,
      anuidade_status: c.anuidade_status,
      link_publico_ativo: c.link_publico_ativo ?? false,
      mensalidade_centavos: c.mensalidade_centavos,
      mensalidade_minima_centavos: cfg.mensalidade_minima_centavos,
      mensalidade_sugerida_centavos: cfg.mensalidade_sugerida_centavos,
      filiacao_liga_centavos: cfg.filiacao_liga_centavos,
      raio_metros: c.raio_metros,
      onboarding_concluido: c.onboarding_concluido,
      unidades: (unidades ?? []).map((u: any) => ({
        id: u.id,
        nome: u.nome,
        is_sede: u.is_sede,
        ativa: u.ativa,
        endereco: u.endereco,
        latitude: u.latitude,
        longitude: u.longitude,
        raio_metros: u.raio_metros,
        fuso_horario: u.fuso_horario,
        dia_aula: u.dia_aula,
        horario_aula: u.horario_aula,
        duracao_minutos: u.duracao_minutos,
      })),
    };
  });

/**
 * Lista fechada de campos da unidade que o sensei pode alterar. Nunca inclui
 * raio, status, piloto, slug, recebedor, anuidade ou link público.
 */
const unidadeInput = z.object({
  unidade_id: z.string().uuid(),
  nome: z.string().trim().min(2).max(80),
  endereco: z.string().trim().max(240).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  fuso_horario: z.string().trim().min(3).max(60),
  dia_aula: z.number().int().min(1).max(7).nullable(),
  horario_aula: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  duracao_minutos: z.number().int().min(30).max(240),
  concluir_onboarding: z.boolean().optional().default(false),
});

export const atualizarMinhaUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => unidadeInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) throw new Error("Sua conta ainda não está vinculada a um clube.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: atual } = await supabaseAdmin
      .from("unidades")
      .select("id, clube_id, latitude, longitude")
      .eq("id", data.unidade_id)
      .maybeSingle();

    if (!atual || atual.clube_id !== clubeId) {
      throw new Error("Esta unidade não pertence ao seu clube.");
    }

    const { error } = await supabaseAdmin
      .from("unidades")
      .update({
        nome: data.nome,
        endereco: data.endereco?.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        fuso_horario: data.fuso_horario,
        dia_aula: data.dia_aula,
        horario_aula: data.horario_aula,
        duracao_minutos: data.duracao_minutos,
      })
      .eq("id", data.unidade_id);
    if (error) throw new Error("Não conseguimos salvar os dados da unidade.");

    const mudouAlfinete =
      (atual.latitude ?? null) !== data.latitude || (atual.longitude ?? null) !== data.longitude;
    if (mudouAlfinete) {
      await supabaseAdmin.from("dojo_alfinete_historico").insert({
        sensei_id: clubeId,
        latitude_antiga: atual.latitude ?? null,
        longitude_antiga: atual.longitude ?? null,
        latitude_nova: data.latitude,
        longitude_nova: data.longitude,
        alterado_por: context.userId,
      });
    }

    if (data.concluir_onboarding) {
      await supabaseAdmin.from("senseis").update({ onboarding_concluido: true }).eq("id", clubeId);
    }

    return { ok: true };
  });

export const definirMinhaMensalidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ mensalidade_centavos: z.number().int().min(0).max(5_000_00) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) throw new Error("Sua conta ainda não está vinculada a um clube.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await lerConfig(supabaseAdmin as never);
    if (data.mensalidade_centavos < cfg.mensalidade_minima_centavos) {
      throw new Error(
        `A mensalidade mínima do clube é de ${(cfg.mensalidade_minima_centavos / 100).toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL" },
        )}.`,
      );
    }

    const { error } = await supabaseAdmin
      .from("senseis")
      .update({ mensalidade_centavos: data.mensalidade_centavos })
      .eq("id", clubeId);
    if (error) throw new Error("Não conseguimos salvar a mensalidade.");
    return { ok: true };
  });

export const listarAtletasDoMeuClube = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AtletaDoClube[]> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vinculos } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id, atleta_id, unidade_id, status_autorizacao, solicitado_em, ate")
      .eq("sensei_id", clubeId)
      .order("solicitado_em", { ascending: true });

    const abertos = (vinculos ?? []).filter((v) => v.ate === null);
    const ids = abertos.map((v) => v.atleta_id);
    if (ids.length === 0) return [];

    const [{ data: perfis }, { data: filiacoes }, { data: unidades }] = await Promise.all([
      supabaseAdmin.from("atletas").select("id, nome, whatsapp, faixa").in("id", ids),
      supabaseAdmin
        .from("filiacoes")
        .select("atleta_id, status, created_at")
        .eq("tipo", "atleta")
        .in("atleta_id", ids)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("unidades").select("id, nome").eq("clube_id", clubeId),
    ]);

    const statusPorAtleta = new Map<string, string>();
    for (const f of filiacoes ?? []) {
      if (f.atleta_id && !statusPorAtleta.has(f.atleta_id)) {
        statusPorAtleta.set(f.atleta_id, f.status);
      }
    }

    return abertos.map((v) => {
      const p = (perfis ?? []).find((x) => x.id === v.atleta_id);
      const u = (unidades ?? []).find((x) => x.id === v.unidade_id);
      return {
        vinculo_id: v.id,
        atleta_id: v.atleta_id,
        nome: p?.nome ?? "—",
        whatsapp: p?.whatsapp ?? "",
        faixa: p?.faixa ?? null,
        unidade_id: v.unidade_id,
        unidade: u?.nome ?? null,
        status_autorizacao: v.status_autorizacao,
        solicitado_em: v.solicitado_em,
        horas_esperando: Math.floor(
          (Date.now() - new Date(v.solicitado_em).getTime()) / 3_600_000,
        ),
        filiacao: statusPorAtleta.get(v.atleta_id) ?? "aguardando",
      };
    });
  });

export type ResultadoAutorizacao = {
  nome: string;
  whatsapp: string;
  cortesia_piloto: boolean;
  mensagem: string;
};

export const autorizarAtleta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ vinculo_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ResultadoAutorizacao> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) throw new Error("Sua conta ainda não está vinculada a um clube.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id, atleta_id, sensei_id, status_autorizacao, ate")
      .eq("id", data.vinculo_id)
      .maybeSingle();

    if (!v || v.sensei_id !== clubeId || v.ate !== null) {
      throw new Error("Este pedido não é do seu clube.");
    }

    const { data: clube } = await supabaseAdmin
      .from("senseis")
      .select("dojo, piloto, slug")
      .eq("id", clubeId)
      .maybeSingle();

    const agora = new Date().toISOString();
    const up = await supabaseAdmin
      .from("atleta_dojos")
      .update({
        status_autorizacao: "autorizado",
        autorizado_em: agora,
        autorizado_por: context.userId,
        recusa_motivo: null,
      })
      .eq("id", v.id);
    if (up.error) throw new Error("Não conseguimos registrar a autorização.");

    const cortesia = !!clube?.piloto;
    if (cortesia) {
      const { data: fil } = await supabaseAdmin
        .from("filiacoes")
        .select("id")
        .eq("tipo", "atleta")
        .eq("atleta_id", v.atleta_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const campos = {
        status: "ativa",
        provedor: "piloto_cortesia",
        motivo: "Cortesia do período piloto",
        sensei_id: clubeId,
        decidido_por: context.userId,
        ativada_em: agora,
        alterada_em: agora,
      };
      const res = fil
        ? await supabaseAdmin.from("filiacoes").update(campos).eq("id", fil.id)
        : await supabaseAdmin
            .from("filiacoes")
            .insert({ tipo: "atleta", atleta_id: v.atleta_id, ...campos });
      if (res.error) {
        throw new Error("Atleta autorizado, mas não conseguimos ativar a filiação de cortesia.");
      }

    }

    const { data: perfil } = await supabaseAdmin
      .from("atletas")
      .select("nome, whatsapp")
      .eq("id", v.atleta_id)
      .maybeSingle();

    const primeiro = (perfil?.nome ?? "").split(" ")[0] ?? "";
    const mensagem = cortesia
      ? `Olá ${primeiro}! Sua entrada no ${clube?.dojo ?? "clube"} foi autorizada. Sua filiação à liga é cortesia no período piloto: entre em karate-sparring.lovable.app/atleta para ver seu passaporte e o dia do treino.`
      : `Olá ${primeiro}! Sua entrada no ${clube?.dojo ?? "clube"} foi autorizada. Conclua sua filiação em karate-sparring.lovable.app/atleta para liberar o passaporte e o ranking.`;

    return {
      nome: perfil?.nome ?? "",
      whatsapp: perfil?.whatsapp ?? "",
      cortesia_piloto: cortesia,
      mensagem,
    };
  });

export const recusarAtleta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        vinculo_id: z.string().uuid(),
        motivo: z.string().trim().max(240).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const clubeId = await clubeIdDoUsuario(context.supabase, context.userId);
    if (!clubeId) throw new Error("Sua conta ainda não está vinculada a um clube.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: v } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id, sensei_id, ate")
      .eq("id", data.vinculo_id)
      .maybeSingle();
    if (!v || v.sensei_id !== clubeId || v.ate !== null) {
      throw new Error("Este pedido não é do seu clube.");
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const { error } = await supabaseAdmin
      .from("atleta_dojos")
      .update({
        status_autorizacao: "recusado",
        recusa_motivo: data.motivo?.trim() || null,
        ate: hoje,
      })
      .eq("id", v.id);
    if (error) throw new Error("Não conseguimos registrar a recusa.");
    return { ok: true };
  });
