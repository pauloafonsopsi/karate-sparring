import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/public/webhooks/greenn")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const expected = process.env["GREENN_WEBHOOK_TOKEN"] ?? "";
        const token = request.headers.get("x-webhook-token") ?? "";
        if (!expected || token !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { ...cors, "content-type": "application/json" },
          });
        }

        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          payload = { raw };
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          const event = (payload["event"] as string) ?? "";
          if (event !== "salePaid") return ok({ ignored: event });

          const sale = (payload["sale"] ?? {}) as Record<string, unknown>;
          const client = (payload["client"] ?? {}) as Record<string, unknown>;
          const saleId = sale["id"] != null ? String(sale["id"]) : null;

          if (saleId) {
            const { data: existing } = await supabaseAdmin
              .from("webhook_log")
              .select("id")
              .eq("provedor", "greenn")
              .eq("sale_id", saleId)
              .maybeSingle();
            if (existing) return ok({ resultado: "duplicado" });
          }

          const email = String(client["email"] ?? "")
            .trim()
            .toLowerCase();

          let resultado = "orfao";

          // A Greenn agora cobre apenas a adesão do sensei.
          const { data: sensei } = email
            ? await supabaseAdmin
                .from("senseis")
                .select("id")
                .ilike("email", email)
                .limit(1)
                .maybeSingle()
            : { data: null };

          if (sensei?.id) {
            await supabaseAdmin
              .from("senseis")
              .update({ adesao_paga: true, data_adesao: new Date().toISOString().slice(0, 10) })
              .eq("id", sensei.id);
            resultado = "adesao_sensei";
          } else {
            await supabaseAdmin.from("pagamentos_orfaos").insert({
              sale_id: saleId,
              email_pagador: email || null,
              documento_pagador: client["document"] ? String(client["document"]) : null,
              payload: payload as never,
            });
          }

          await supabaseAdmin.from("webhook_log").insert({
            provedor: "greenn",
            evento_id: saleId,
            sale_id: saleId,
            payload: payload as never,
            processado: true,
            resultado,
          });

          return ok({ resultado });
        } catch (error) {
          await supabaseAdmin.from("webhook_log").insert({
            payload: payload as never,
            processado: false,
            resultado: `erro: ${String(error).slice(0, 300)}`,
          });
          return ok({ resultado: "erro" });
        }
      },
    },
  },
});
