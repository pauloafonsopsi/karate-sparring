import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FAIXAS } from "@/lib/faixas";
import { FUSOS } from "@/lib/semana";

/* ============================ Guarda ============================ */

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(data ?? []).some((p: { role: string }) => p.role === "admin")) {
    throw new Error("Apenas administradores podem fazer isso.");
  }
}

/* ============================ Config ============================ */

/** Parâmetros operacionais editáveis pelo admin, com padrões seguros. */
export const PARAMETROS = {
  filiacao_liga_centavos: 1990,
  mensalidade_minima_centavos: 3000,
  mensalidade_sugerida_centavos: 12000,
  anuidade_centavos: 120000,
  anuidade_mensal_centavos: 12000,
  anuidade_unidade_extra_centavos: 60000,
  anuidade_unidade_extra_mensal_centavos: 6000,
  carencia_troca_dias: 60,
  bloqueio_recusa_dias: 30,
  pontos_presenca: 10,
  pontos_sequencia: 15,
  pontos_curso: 25,
  vagas_camp: 20,
} as const;

export type ChaveParametro = keyof typeof PARAMETROS;

/** Textos editáveis pelo admin (vitrine e Legends Camp). */
export const TEXTOS = {
  camp_titulo: "Legends Camp",
  camp_data_local: "",
  camp_texto:
    "Os melhores do ranking de cada temporada são convocados para treinar com as lendas do karatê.",
  camp_link: "",
} as const;

export type ChaveTexto = keyof typeof TEXTOS;

export type ConfigAdmin = {
  modo_piloto: boolean;
  inscricoes_abertas: boolean;
  camp_ativo: boolean;
  aviso_global: string;
  numeros: Record<ChaveParametro, number>;
  textos: Record<ChaveTexto, string>;
};

export const getConfigAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfigAdmin> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("config").select("chave, valor");
    const map = new Map((data ?? []).map((r) => [r.chave, r.valor]));

    const numeros = {} as Record<ChaveParametro, number>;
    for (const chave of Object.keys(PARAMETROS) as ChaveParametro[]) {
      const v = Number(map.get(chave));
      numeros[chave] = Number.isFinite(v) && v > 0 ? v : PARAMETROS[chave];
    }
    const textos = {} as Record<ChaveTexto, string>;
    for (const chave of Object.keys(TEXTOS) as ChaveTexto[]) {
      textos[chave] = map.has(chave) ? (map.get(chave) ?? "") : TEXTOS[chave];
    }

    return {
      modo_piloto: map.get("modo_piloto") !== "false",
      inscricoes_abertas: map.get("inscricoes_abertas") !== "false",
      camp_ativo: map.get("camp_ativo") !== "false",
      aviso_global: map.get("aviso_global") ?? "",
      numeros,
      textos,
    };
  });

const limites: Record<ChaveParametro, { min: number; max: number }> = {
  filiacao_liga_centavos: { min: 0, max: 500_00 },
  mensalidade_minima_centavos: { min: 1000, max: 1_000_00 },
  mensalidade_sugerida_centavos: { min: 1000, max: 5_000_00 },
  anuidade_centavos: { min: 0, max: 50_000_00 },
  anuidade_mensal_centavos: { min: 0, max: 5_000_00 },
  anuidade_unidade_extra_centavos: { min: 0, max: 50_000_00 },
  anuidade_unidade_extra_mensal_centavos: { min: 0, max: 5_000_00 },
  carencia_troca_dias: { min: 0, max: 365 },
  bloqueio_recusa_dias: { min: 0, max: 365 },
  pontos_presenca: { min: 1, max: 1000 },
  pontos_sequencia: { min: 1, max: 1000 },
  pontos_curso: { min: 1, max: 1000 },
  vagas_camp: { min: 1, max: 500 },
};

const configInput = z.object({
  modo_piloto: z.boolean().optional(),
  inscricoes_abertas: z.boolean().optional(),
  camp_ativo: z.boolean().optional(),
  aviso_global: z.string().trim().max(280).optional(),
  numeros: z.record(z.string(), z.number().int()).optional(),
  textos: z
    .object({
      camp_titulo: z.string().trim().max(60),
      camp_data_local: z.string().trim().max(80),
      camp_texto: z.string().trim().max(400),
      camp_link: z.union([z.literal(""), z.string().trim().url().max(300)]),
    })
    .partial()
    .optional(),
});

export const salvarConfigAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => configInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const linhas: { chave: string; valor: string }[] = [];
    if (data.modo_piloto !== undefined) {
      linhas.push({ chave: "modo_piloto", valor: String(data.modo_piloto) });
    }
    if (data.inscricoes_abertas !== undefined) {
      linhas.push({ chave: "inscricoes_abertas", valor: String(data.inscricoes_abertas) });
    }
    if (data.aviso_global !== undefined) {
      linhas.push({ chave: "aviso_global", valor: data.aviso_global });
    }
    if (data.camp_ativo !== undefined) {
      linhas.push({ chave: "camp_ativo", valor: String(data.camp_ativo) });
    }
    for (const [chave, valor] of Object.entries(data.textos ?? {})) {
      if (valor !== undefined) linhas.push({ chave, valor });
    }
    for (const [chave, valor] of Object.entries(data.numeros ?? {})) {
      const lim = limites[chave as ChaveParametro];
      if (!lim) throw new Error(`Parâmetro desconhecido: ${chave}`);
      if (valor < lim.min || valor > lim.max) {
        throw new Error(`Valor fora do permitido para ${chave}.`);
      }
      linhas.push({ chave, valor: String(valor) });
    }
    if (linhas.length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("config").upsert(linhas, { onConflict: "chave" });
    if (error) throw new Error("Não conseguimos salvar as configurações.");
    return { ok: true };
  });

/* ============================ Atletas ============================ */

export type AtletaAdmin = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  faixa: string | null;
  aceite_marketing_eventos: boolean;
  created_at: string;
  clube_id: string | null;
  clube: string | null;
  unidade_id: string | null;
  unidade: string | null;
  status_autorizacao: string | null;
  filiacao: string;
};

export const listarAtletasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AtletaAdmin[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: atletas }, { data: vinculos }, { data: filiacoes }, { data: clubes }, { data: unidades }] =
      await Promise.all([
        supabaseAdmin
          .from("atletas")
          .select(
            "id, nome, email, whatsapp, data_nascimento, faixa, aceite_marketing_eventos, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("atleta_dojos")
          .select("atleta_id, sensei_id, unidade_id, status_autorizacao")
          .is("ate", null),
        supabaseAdmin
          .from("filiacoes")
          .select("atleta_id, status, created_at")
          .eq("tipo", "atleta")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("senseis").select("id, dojo"),
        supabaseAdmin.from("unidades").select("id, nome"),
      ]);

    const porAtleta = new Map<string, string>();
    for (const f of filiacoes ?? []) {
      if (f.atleta_id && !porAtleta.has(f.atleta_id)) porAtleta.set(f.atleta_id, f.status);
    }

    return (atletas ?? []).map((a) => {
      const v = (vinculos ?? []).find((x) => x.atleta_id === a.id) ?? null;
      const c = (clubes ?? []).find((x) => x.id === v?.sensei_id) ?? null;
      const u = (unidades ?? []).find((x) => x.id === v?.unidade_id) ?? null;
      return {
        id: a.id,
        nome: a.nome,
        email: a.email,
        whatsapp: a.whatsapp,
        data_nascimento: a.data_nascimento,
        faixa: a.faixa,
        aceite_marketing_eventos: a.aceite_marketing_eventos,
        created_at: a.created_at,
        clube_id: v?.sensei_id ?? null,
        clube: c?.dojo ?? null,
        unidade_id: v?.unidade_id ?? null,
        unidade: u?.nome ?? null,
        status_autorizacao: v?.status_autorizacao ?? null,
        filiacao: porAtleta.get(a.id) ?? "aguardando",
      };
    });
  });

const atletaInput = z.object({
  atleta_id: z.string().uuid(),
  nome: z.string().trim().min(3).max(120),
  whatsapp: z.string().trim().min(10).max(20),
  faixa: z.enum(FAIXAS).nullable(),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  aceite_marketing_eventos: z.boolean(),
});

export const atualizarAtletaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => atletaInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("atletas")
      .update({
        nome: data.nome,
        whatsapp: data.whatsapp,
        faixa: data.faixa,
        data_nascimento: data.data_nascimento,
        aceite_marketing_eventos: data.aceite_marketing_eventos,
      })
      .eq("id", data.atleta_id);
    if (error) throw new Error("Não conseguimos salvar os dados do atleta.");
    return { ok: true };
  });

/** Troca o atleta de unidade dentro do mesmo clube. */
export const definirUnidadeDoAtleta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ atleta_id: z.string().uuid(), unidade_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vinculo } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id, sensei_id")
      .eq("atleta_id", data.atleta_id)
      .is("ate", null)
      .maybeSingle();
    if (!vinculo) throw new Error("Este atleta não tem vínculo ativo com um clube.");

    const { data: unidade } = await supabaseAdmin
      .from("unidades")
      .select("id, clube_id")
      .eq("id", data.unidade_id)
      .maybeSingle();
    if (!unidade || unidade.clube_id !== vinculo.sensei_id) {
      throw new Error("Esta unidade não pertence ao clube atual do atleta.");
    }

    const { error } = await supabaseAdmin
      .from("atleta_dojos")
      .update({ unidade_id: data.unidade_id })
      .eq("id", vinculo.id);
    if (error) throw new Error("Não conseguimos trocar a unidade.");
    return { ok: true };
  });

export const excluirAtletaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ atleta_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    if (data.atleta_id === context.userId) {
      throw new Error("Você não pode excluir a sua própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("leads_atletas").update({ atleta_id: null }).eq("atleta_id", data.atleta_id);
    await supabaseAdmin.from("filiacoes").delete().eq("atleta_id", data.atleta_id);
    await supabaseAdmin.from("atleta_dojos").delete().eq("atleta_id", data.atleta_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.atleta_id);
    const { error } = await supabaseAdmin.from("atletas").delete().eq("id", data.atleta_id);
    if (error) throw new Error("Não conseguimos excluir o cadastro do atleta.");
    await supabaseAdmin.auth.admin.deleteUser(data.atleta_id);
    return { ok: true };
  });

/* ============================ Clubes ============================ */

function slugificar(txt: string) {
  return (
    txt
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "clube"
  );
}

const clubeNovoInput = z.object({
  dojo: z.string().trim().min(2).max(120),
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().min(10).max(20),
  cidade: z.string().trim().min(2).max(120),
  uf: z.string().trim().length(2),
  graduacao: z.string().trim().max(60).nullable(),
  mensalidade_centavos: z.number().int().min(0).max(5_000_00).nullable(),
  piloto: z.boolean(),
});

export const criarClubeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clubeNovoInput.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string; slug: string }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: existente } = await supabaseAdmin
      .from("senseis")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existente) throw new Error("Já existe um clube com este email.");

    const base = slugificar(data.dojo);
    let slug = base;
    for (let i = 0; i < 12; i++) {
      const { data: colisao } = await supabaseAdmin
        .from("senseis")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!colisao) break;
      slug = i === 0 ? `${base}-${slugificar(data.cidade)}` : `${base}-${i + 1}`;
    }

    const { data: novo, error } = await supabaseAdmin
      .from("senseis")
      .insert({
        dojo: data.dojo,
        nome: data.nome,
        email,
        whatsapp: data.whatsapp,
        cidade: data.cidade,
        uf: data.uf.toUpperCase(),
        graduacao: data.graduacao?.trim() || null,
        mensalidade_centavos: data.mensalidade_centavos,
        piloto: data.piloto,
        slug,
        status: "aprovado",
        recebedor_status: data.piloto ? "dispensada_piloto" : "pendente",
        anuidade_status: data.piloto ? "isento_piloto" : "pendente",
      })
      .select("id, slug")
      .single();
    if (error) throw new Error("Não conseguimos criar o clube.");
    return { id: novo.id, slug: novo.slug };
  });

const clubeEdicaoInput = z.object({
  clube_id: z.string().uuid(),
  dojo: z.string().trim().min(2).max(120),
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().min(10).max(20),
  cidade: z.string().trim().min(2).max(120),
  uf: z.string().trim().length(2),
  graduacao: z.string().trim().max(60).nullable(),
  tempo_ensino: z.string().trim().max(60).nullable(),
  instagram: z.string().trim().max(120).nullable(),
  mensalidade_centavos: z.number().int().min(0).max(5_000_00).nullable(),
  foto_url: z.string().trim().max(400).nullable(),
  obs: z.string().trim().max(600).nullable(),
});

export const atualizarClubeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clubeEdicaoInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const { data: conflito } = await supabaseAdmin
      .from("senseis")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (conflito && conflito.id !== data.clube_id) {
      throw new Error("Outro clube já usa este email.");
    }

    const { error } = await supabaseAdmin
      .from("senseis")
      .update({
        dojo: data.dojo,
        nome: data.nome,
        email,
        whatsapp: data.whatsapp,
        cidade: data.cidade,
        uf: data.uf.toUpperCase(),
        graduacao: data.graduacao?.trim() || null,
        tempo_ensino: data.tempo_ensino?.trim() || null,
        instagram: data.instagram?.trim() || null,
        mensalidade_centavos: data.mensalidade_centavos,
        foto_url: data.foto_url?.trim() || null,
        obs: data.obs?.trim() || null,
      })
      .eq("id", data.clube_id);
    if (error) throw new Error("Não conseguimos salvar os dados do clube.");
    return { ok: true };
  });

/* ============================ Unidades ============================ */

const unidadeAdminInput = z.object({
  unidade_id: z.string().uuid(),
  nome: z.string().trim().min(2).max(80),
  endereco: z.string().trim().max(240).nullable(),
  fuso_horario: z.enum(FUSOS),
  dia_aula: z.number().int().min(1).max(7).nullable(),
  horario_aula: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  duracao_minutos: z.number().int().min(30).max(240),
  raio_metros: z.number().int().min(50).max(2000),
  ativa: z.boolean(),
});

export const atualizarUnidadeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => unidadeAdminInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("unidades")
      .update({
        nome: data.nome,
        endereco: data.endereco?.trim() || null,
        fuso_horario: data.fuso_horario,
        dia_aula: data.dia_aula,
        horario_aula: data.horario_aula,
        duracao_minutos: data.duracao_minutos,
        raio_metros: data.raio_metros,
        ativa: data.ativa,
      })
      .eq("id", data.unidade_id);
    if (error) throw new Error("Não conseguimos salvar a unidade.");
    return { ok: true };
  });

export const excluirUnidadeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ unidade_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: u } = await supabaseAdmin
      .from("unidades")
      .select("id, is_sede")
      .eq("id", data.unidade_id)
      .maybeSingle();
    if (!u) throw new Error("Unidade não encontrada.");
    if (u.is_sede) throw new Error("A sede do clube não pode ser excluída.");

    const { count } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id", { count: "exact", head: true })
      .eq("unidade_id", data.unidade_id);
    if ((count ?? 0) > 0) {
      throw new Error("Esta unidade tem atletas vinculados. Mova-os antes de excluir.");
    }

    const { error } = await supabaseAdmin.from("unidades").delete().eq("id", data.unidade_id);
    if (error) throw new Error("Não conseguimos excluir a unidade.");
    return { ok: true };
  });

/* ============================ Papéis ============================ */

export type UsuarioAdmin = {
  user_id: string;
  email: string;
  papeis: string[];
  clube: string | null;
  ultimo_acesso: string | null;
};

export const listarUsuariosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioAdmin[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: lista }, { data: papeis }, { data: vinculos }, { data: clubes }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("sensei_users").select("user_id, sensei_id"),
        supabaseAdmin.from("senseis").select("id, dojo"),
      ]);

    return (lista?.users ?? []).map((u) => {
      const v = (vinculos ?? []).find((x) => x.user_id === u.id) ?? null;
      const c = (clubes ?? []).find((x) => x.id === v?.sensei_id) ?? null;
      return {
        user_id: u.id,
        email: u.email ?? "—",
        papeis: (papeis ?? []).filter((p) => p.user_id === u.id).map((p) => p.role as string),
        clube: c?.dojo ?? null,
        ultimo_acesso: u.last_sign_in_at ?? null,
      };
    });
  });

export const definirPapelAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "sensei", "atleta"]),
        conceder: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    if (data.user_id === context.userId && data.role === "admin" && !data.conceder) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.conceder) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error("Não conseguimos conceder o papel.");
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error("Não conseguimos remover o papel.");
    }
    return { ok: true };
  });
