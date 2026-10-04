import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PARAMETROS, TEXTOS, type ChaveParametro, type ChaveTexto } from "@/lib/admin.functions";

export type PublicSensei = {
  id: string;
  nome: string;
  dojo: string;
  cidade: string;
  uf: string;
  graduacao: string | null;
  foto_url: string | null;
  piloto: boolean;
};

export type AppConfig = {
  modo_piloto: boolean;
  inscricoes_abertas: boolean;
  aviso_global: string;
  camp_ativo: boolean;
  publico_destaque: "sensei" | "atleta";
  numeros: Record<ChaveParametro, number>;
  textos: Record<ChaveTexto, string>;
};

export const getAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppConfig> => {
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
      aviso_global: (map.get("aviso_global") ?? "").trim(),
      camp_ativo: map.get("camp_ativo") !== "false",
      publico_destaque: map.get("publico_destaque") === "atleta" ? "atleta" : "sensei",
      numeros,
      textos,
    };
  },
);

export const getPublicSenseis = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSensei[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, dojo, cidade, uf, graduacao, foto_url, piloto")
      .eq("status", "ativo")
      .order("uf");

    if (error) throw new Error("Não foi possível carregar os dojôs disponíveis.");
    return (data ?? []) as PublicSensei[];
  },
);

const aplicacaoSenseiInput = z.object({
  nome: z.string().trim().min(3).max(120),
  dojo: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(120),
  uf: z.string().trim().length(2),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(160),
  graduacao: z.string().trim().max(60).optional().nullable(),
  tempo_ensino: z.string().trim().max(60).optional().nullable(),
  instagram: z.string().trim().max(120).optional().nullable(),
  tipo_licenca: z.enum(["clube", "liga"]).optional().default("clube"),
});

export const criarAplicacaoSensei = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => aplicacaoSenseiInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: existente } = await supabaseAdmin
      .from("senseis")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existente) throw new Error("Já existe uma aplicação com este email.");

    const base =
      data.dojo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "clube";

    let slug = base;
    for (let i = 0; i < 12; i++) {
      const { data: colisao } = await supabaseAdmin
        .from("senseis")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!colisao) break;
      slug =
        i === 0
          ? `${base}-${data.cidade
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`
          : `${base}-${i + 1}`;
    }

    const { error } = await supabaseAdmin.from("senseis").insert({
      nome: data.nome,
      dojo: data.dojo,
      slug,
      cidade: data.cidade,
      uf: data.uf.toUpperCase(),
      whatsapp: data.whatsapp,
      email,
      graduacao: data.graduacao?.trim() || null,
      tempo_ensino: data.tempo_ensino?.trim() || null,
      instagram: data.instagram?.trim() || null,
      status: "aplicou",
      tipo_licenca: data.tipo_licenca,
    });

    if (error) {
      throw new Error(
        error.code === "23505"
          ? "Já existe uma aplicação com este email."
          : "Não conseguimos enviar sua aplicação. Tente novamente em instantes.",
      );
    }
    return { ok: true };
  });

const leadInput = z.object({
  nome: z.string().trim().min(3).max(120),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(160),
  cidade: z.string().trim().max(120).optional().nullable(),
  uf: z.string().trim().length(2),
  sensei_id: z.string().uuid().nullable(),
  aceite_lgpd: z.literal(true),
});

export const criarLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadInput.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead, error } = await supabaseAdmin
      .from("leads_atletas")
      .insert({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email.toLowerCase(),
        cidade: data.cidade?.trim() || null,
        uf: data.uf.toUpperCase(),
        sensei_id: data.sensei_id,
        aceite_lgpd: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: lead.id };
  });
