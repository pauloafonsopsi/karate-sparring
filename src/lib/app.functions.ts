import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AppConfig = {
  modo_piloto: boolean;
  inscricoes_abertas: boolean;
};

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

export const getAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("config").select("chave, valor");
    const map = new Map((data ?? []).map((r) => [r.chave, r.valor]));
    return {
      modo_piloto: map.get("modo_piloto") !== "false",
      inscricoes_abertas: map.get("inscricoes_abertas") !== "false",
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

const checkoutInput = z.object({
  lead_id: z.string().uuid(),
  produto: z.enum(["mensal", "avulso"]),
});

export const redirectCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: lead } = await supabaseAdmin
      .from("leads_atletas")
      .update({ produto_escolhido: data.produto })
      .eq("id", data.lead_id)
      .select("sensei_id")
      .maybeSingle();

    if (!lead?.sensei_id) return { url: "" };

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("link_afiliado_mensal, link_afiliado_avulso")
      .eq("id", lead.sensei_id)
      .maybeSingle();

    const url =
      (data.produto === "mensal" ? sensei?.link_afiliado_mensal : sensei?.link_afiliado_avulso) ??
      "";

    return { url: url.trim() };
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
