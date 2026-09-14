import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, asaas-access-token, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "content-type": "application/json" },
  });

const CONFIRMADOS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

export const Route = createFileRoute("/api/public/webhooks/asaas")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const expected = process.env["ASAAS_WEBHOOK_TOKEN"] ?? "";
        const token = request.headers.get("asaas-access-token") ?? "";
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
          const event = String(payload["event"] ?? "");
          const eventoId = payload["id"] != null ? String(payload["id"]) : null;
          const pagamento = (payload["payment"] ?? {}) as Record<string, unknown>;
          const paymentId = pagamento["id"] != null ? String(pagamento["id"]) : null;

          if (eventoId) {
            const { data: existente } = await supabaseAdmin
              .from("webhook_log")
              .select("id")
              .eq("provedor", "asaas")
              .eq("evento_id", eventoId)
              .maybeSingle();
            if (existente) return ok({ resultado: "duplicado" });
          }

          const registrar = async (resultado: string) => {
            await supabaseAdmin.from("webhook_log").insert({
              provedor: "asaas",
              evento_id: eventoId,
              sale_id: paymentId,
              payload: payload as never,
              processado: true,
              resultado,
            });
          };

          const novoStatus = CONFIRMADOS.has(event)
            ? "confirmado"
            : event === "PAYMENT_OVERDUE"
              ? "vencido"
              : event === "PAYMENT_REFUNDED" || event === "PAYMENT_CHARGEBACK_REQUESTED"
                ? "estornado"
                : null;

          if (!novoStatus) {
            await registrar(`ignorado:${event}`);
            return ok({ ignored: event });
          }

          const { data: registro } = paymentId
            ? await supabaseAdmin
                .from("pagamentos")
                .update({ status: novoStatus, payload: payload as never })
                .eq("asaas_payment_id", paymentId)
                .select("id, lead_id, produto, sensei_id")
                .maybeSingle()
            : { data: null };

          let alvo = registro;

          // Cobranças geradas pela assinatura nos meses seguintes têm outro id.
          if (!alvo && pagamento["subscription"]) {
            const subId = String(pagamento["subscription"]);
            const { data: assinatura } = await supabaseAdmin
              .from("pagamentos")
              .select("id, lead_id, produto, sensei_id")
              .eq("asaas_subscription_id", subId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (assinatura) {
              await supabaseAdmin
                .from("pagamentos")
                .update({ status: novoStatus, asaas_payment_id: paymentId })
                .eq("id", assinatura.id);
              alvo = assinatura;
            }
          }

          if (!alvo) {
            // Sem cobrança correspondente: busca os dados do pagador no Asaas para
            // permitir a conciliação (e tenta casar automaticamente pelo email).
            let email: string | null = null;
            let documento: string | null = null;
            try {
              const customerId = pagamento["customer"] ? String(pagamento["customer"]) : null;
              if (customerId) {
                const { asaasFetch } = await import("@/lib/asaas.server");
                const { data: cfg } = await supabaseAdmin
                  .from("config")
                  .select("valor")
                  .eq("chave", "asaas_ambiente")
                  .maybeSingle();
                const cliente = await asaasFetch<{ email?: string; cpfCnpj?: string }>(
                  cfg?.valor === "production" ? "production" : "sandbox",
                  `/customers/${customerId}`,
                );
                email = cliente.email?.toLowerCase() ?? null;
                documento = cliente.cpfCnpj ?? null;
              }
            } catch (e) {
              console.error("[asaas] falha ao buscar pagador do orfao", String(e).slice(0, 200));
            }

            let leadId: string | null = null;
            if (email) {
              const { data: lead } = await supabaseAdmin
                .from("leads_atletas")
                .select("id")
                .eq("email", email)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              leadId = lead?.id ?? null;
            }

            await supabaseAdmin.from("pagamentos_orfaos").insert({
              sale_id: paymentId,
              email_pagador: email,
              documento_pagador: documento,
              conciliado: leadId != null,
              lead_id: leadId,
              payload: payload as never,
            });

            if (leadId && novoStatus === "confirmado") {
              await supabaseAdmin
                .from("leads_atletas")
                .update({
                  status: "orfao_conciliado",
                  greenn_sale_id: paymentId,
                  convertido_em: new Date().toISOString(),
                })
                .eq("id", leadId);
            }

            await registrar(leadId ? "orfao_conciliado_por_email" : "orfao");
            return ok({ resultado: leadId ? "orfao_conciliado" : "orfao" });
          }

          // Adesão do sensei: 12x de R$ 150 cobradas pelo Asaas.
          if (novoStatus === "confirmado" && alvo.produto === "adesao" && alvo.sensei_id) {
            await supabaseAdmin
              .from("senseis")
              .update({
                adesao_paga: true,
                data_adesao: new Date().toISOString().slice(0, 10),
              })
              .eq("id", alvo.sensei_id);
            await registrar("adesao_sensei");
            return ok({ resultado: "adesao_sensei" });
          }

          if (novoStatus === "confirmado" && alvo.lead_id) {
            await supabaseAdmin
              .from("leads_atletas")
              .update({
                status: "convertido",
                greenn_sale_id: paymentId,
                convertido_em: new Date().toISOString(),
              })
              .eq("id", alvo.lead_id);
          }

          await registrar(novoStatus === "confirmado" ? "matched" : novoStatus);
          return ok({ resultado: novoStatus });
        } catch (error) {
          await supabaseAdmin.from("webhook_log").insert({
            provedor: "asaas",
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
