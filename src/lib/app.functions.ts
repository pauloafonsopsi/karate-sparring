import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AppConfig = {
  modo_piloto: boolean;
  inscricoes_abertas: boolean;
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
