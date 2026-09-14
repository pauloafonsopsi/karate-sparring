import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingType = "PIX" | "CREDIT_CARD";

export type InicioPagamento = {
  url: string;
  mensagem?: string;
};

async function lerConfig() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("config").select("chave, valor");
  const map = new Map((data ?? []).map((r) => [r.chave, r.valor]));
  const num = (chave: string, fallback: number) => {
    const v = Number(map.get(chave));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    ambiente: map.get("asaas_ambiente") === "production" ? "production" : "sandbox",
    preco_mensal: num("preco_mensal", 100),
    preco_avulso: num("preco_avulso", 30),
    repasse_mensal: num("repasse_mensal", 80),
    repasse_avulso: num("repasse_avulso", 20),
  } as const;
}

const pagamentoInput = z.object({
  lead_id: z.string().uuid(),
  produto: z.enum(["mensal", "avulso"]),
  billing_type: z.enum(["PIX", "CREDIT_CARD"]),
  cpf: z.string().trim().min(11).max(18),
});

export const iniciarPagamento = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pagamentoInput.parse(data))
  .handler(async ({ data }): Promise<InicioPagamento> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { asaasFetch, onlyDigits, proximoVencimento } = await import("./asaas.server");

    const cfg = await lerConfig();
    const env = cfg.ambiente;

    const { data: lead } = await supabaseAdmin
      .from("leads_atletas")
      .update({ produto_escolhido: data.produto })
      .eq("id", data.lead_id)
      .select("id, nome, email, whatsapp, sensei_id")
      .maybeSingle();

    if (!lead) throw new Error("Cadastro não encontrado. Refaça a inscrição.");
    if (!lead.sensei_id) {
      return {
        url: "",
        mensagem:
          "Inscrições para este dojô abrem em breve. Seu cadastro foi salvo e avisaremos você no WhatsApp.",
      };
    }

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, asaas_wallet_id")
      .eq("id", lead.sensei_id)
      .maybeSingle();

    if (!sensei?.asaas_wallet_id) {
      return {
        url: "",
        mensagem:
          "Inscrições para este dojô abrem em breve. Seu cadastro foi salvo e avisaremos você no WhatsApp.",
      };
    }

    const valor = data.produto === "mensal" ? cfg.preco_mensal : cfg.preco_avulso;
    const repasse = data.produto === "mensal" ? cfg.repasse_mensal : cfg.repasse_avulso;

    const cliente = await asaasFetch<{ id: string }>(env, "/customers", {
      method: "POST",
      body: {
        name: lead.nome,
        email: lead.email,
        mobilePhone: onlyDigits(lead.whatsapp),
        cpfCnpj: onlyDigits(data.cpf),
        externalReference: lead.id,
        notificationDisabled: false,
      },
    });

    const split = [{ walletId: sensei.asaas_wallet_id, fixedValue: repasse }];
    const descricao =
      data.produto === "mensal"
        ? `Karate Sparring · mensal · ${sensei.nome}`
        : `Karate Sparring · avulso · ${sensei.nome}`;

    let paymentId: string | null = null;
    let subscriptionId: string | null = null;
    let invoiceUrl = "";
    let bruto: unknown = null;

    if (data.produto === "mensal") {
      const sub = await asaasFetch<{ id: string }>(env, "/subscriptions", {
        method: "POST",
        body: {
          customer: cliente.id,
          billingType: data.billing_type,
          value: valor,
          nextDueDate: proximoVencimento(1),
          cycle: "MONTHLY",
          description: descricao,
          externalReference: lead.id,
          split,
        },
      });
      subscriptionId = sub.id;
      bruto = sub;

      const cobrancas = await asaasFetch<{
        data?: { id: string; invoiceUrl?: string }[];
      }>(env, `/subscriptions/${sub.id}/payments`);
      const primeira = cobrancas.data?.[0];
      paymentId = primeira?.id ?? null;
      invoiceUrl = primeira?.invoiceUrl ?? "";
    } else {
      const pag = await asaasFetch<{ id: string; invoiceUrl?: string }>(env, "/payments", {
        method: "POST",
        body: {
          customer: cliente.id,
          billingType: data.billing_type,
          value: valor,
          dueDate: proximoVencimento(1),
          description: descricao,
          externalReference: lead.id,
          split,
        },
      });
      paymentId = pag.id;
      invoiceUrl = pag.invoiceUrl ?? "";
      bruto = pag;
    }

    const { error } = await supabaseAdmin.from("pagamentos").insert({
      lead_id: lead.id,
      sensei_id: sensei.id,
      produto: data.produto,
      provedor: "asaas",
      asaas_customer_id: cliente.id,
      asaas_payment_id: paymentId,
      asaas_subscription_id: subscriptionId,
      valor_total: valor,
      valor_sensei: repasse,
      billing_type: data.billing_type,
      status: "pendente",
      invoice_url: invoiceUrl || null,
      payload: bruto as never,
    });
    if (error) console.error("[asaas] falha ao gravar pagamento", error.message);

    if (!invoiceUrl) {
      return {
        url: "",
        mensagem:
          "Sua cobrança foi criada, mas não conseguimos abrir a página de pagamento. Vamos te enviar o link no WhatsApp.",
      };
    }

    return { url: invoiceUrl };
  });

const subcontaInput = z.object({
  sensei_id: z.string().uuid(),
  cpf_cnpj: z.string().trim().min(11).max(18),
  nascimento: z.string().trim().min(8).max(10),
  cep: z.string().trim().min(8).max(9),
  endereco: z.string().trim().min(3).max(160),
  numero: z.string().trim().min(1).max(10),
  bairro: z.string().trim().min(2).max(120),
  faturamento_mensal: z.coerce.number().min(0).max(1_000_000),
});

export const criarSubcontaSensei = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subcontaInput.parse(data))
  .handler(async ({ data, context }): Promise<{ wallet_id: string }> => {
    const { data: admin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!admin) throw new Error("Apenas administradores podem criar contas de recebimento.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { asaasFetch, onlyDigits } = await import("./asaas.server");
    const cfg = await lerConfig();

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, email, whatsapp, cidade, uf, asaas_wallet_id")
      .eq("id", data.sensei_id)
      .maybeSingle();

    if (!sensei) throw new Error("Sensei não encontrado.");
    if (sensei.asaas_wallet_id) return { wallet_id: sensei.asaas_wallet_id };

    const conta = await asaasFetch<{ id: string; walletId: string; accountNumber?: unknown }>(
      cfg.ambiente,
      "/accounts",
      {
        method: "POST",
        body: {
          name: sensei.nome,
          email: sensei.email,
          cpfCnpj: onlyDigits(data.cpf_cnpj),
          birthDate: data.nascimento,
          companyType: null,
          mobilePhone: onlyDigits(sensei.whatsapp),
          address: data.endereco,
          addressNumber: data.numero,
          province: data.bairro,
          postalCode: onlyDigits(data.cep),
          incomeValue: data.faturamento_mensal,
        },
      },
    );

    const { error } = await supabaseAdmin
      .from("senseis")
      .update({
        asaas_account_id: conta.id,
        asaas_wallet_id: conta.walletId,
        asaas_status: "criada",
      })
      .eq("id", sensei.id);
    if (error) throw new Error(error.message);

    return { wallet_id: conta.walletId };
  });

/* ---------------- ADESÃO DO SENSEI (Asaas) ---------------- */

const adesaoInput = z.object({
  sensei_id: z.string().uuid(),
  cpf_cnpj: z.string().trim().min(11).max(18),
  billing_type: z.enum(["PIX", "CREDIT_CARD"]),
});

export const criarCobrancaAdesao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adesaoInput.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { data: admin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!admin) throw new Error("Apenas administradores podem cobrar a adesão.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { asaasFetch, onlyDigits, proximoVencimento } = await import("./asaas.server");

    const cfg = await lerConfig();
    const env = cfg.ambiente;

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, email, whatsapp")
      .eq("id", data.sensei_id)
      .maybeSingle();
    if (!sensei) throw new Error("Sensei não encontrado.");

    const cliente = await asaasFetch<{ id: string }>(env, "/customers", {
      method: "POST",
      body: {
        name: sensei.nome,
        email: sensei.email,
        mobilePhone: onlyDigits(sensei.whatsapp),
        cpfCnpj: onlyDigits(data.cpf_cnpj),
        externalReference: `sensei:${sensei.id}`,
        notificationDisabled: false,
      },
    });

    const descricao = `Karate Sparring · adesão sensei · ${sensei.nome}`;
    const primeiro = proximoVencimento(3);

    let paymentId: string | null = null;
    let subscriptionId: string | null = null;
    let invoiceUrl = "";
    let bruto: unknown = null;

    if (data.billing_type === "CREDIT_CARD") {
      const pag = await asaasFetch<{ id: string; invoiceUrl?: string }>(env, "/payments", {
        method: "POST",
        body: {
          customer: cliente.id,
          billingType: "CREDIT_CARD",
          installmentCount: cfg.adesao_parcelas,
          installmentValue: cfg.adesao_parcela,
          dueDate: primeiro,
          description: descricao,
          externalReference: `sensei:${sensei.id}`,
        },
      });
      paymentId = pag.id;
      invoiceUrl = pag.invoiceUrl ?? "";
      bruto = pag;
    } else {
      const fim = new Date(primeiro);
      fim.setMonth(fim.getMonth() + (cfg.adesao_parcelas - 1));
      const sub = await asaasFetch<{ id: string }>(env, "/subscriptions", {
        method: "POST",
        body: {
          customer: cliente.id,
          billingType: "PIX",
          value: cfg.adesao_parcela,
          nextDueDate: primeiro,
          endDate: fim.toISOString().slice(0, 10),
          cycle: "MONTHLY",
          description: descricao,
          externalReference: `sensei:${sensei.id}`,
        },
      });
      subscriptionId = sub.id;
      bruto = sub;
      const cobrancas = await asaasFetch<{ data?: { id: string; invoiceUrl?: string }[] }>(
        env,
        `/subscriptions/${sub.id}/payments`,
      );
      const primeira = cobrancas.data?.[0];
      paymentId = primeira?.id ?? null;
      invoiceUrl = primeira?.invoiceUrl ?? "";
    }

    await supabaseAdmin.from("pagamentos").insert({
      lead_id: null,
      sensei_id: sensei.id,
      produto: "adesao",
      provedor: "asaas",
      asaas_customer_id: cliente.id,
      asaas_payment_id: paymentId,
      asaas_subscription_id: subscriptionId,
      valor_total: cfg.adesao_total,
      valor_sensei: 0,
      billing_type: data.billing_type,
      status: "pendente",
      invoice_url: invoiceUrl || null,
      payload: bruto as never,
    });

    await supabaseAdmin
      .from("senseis")
      .update({ adesao_invoice_url: invoiceUrl || null, adesao_asaas_id: subscriptionId ?? paymentId })
      .eq("id", sensei.id);

    if (!invoiceUrl) throw new Error("Cobrança criada, mas o Asaas não retornou o link.");
    return { url: invoiceUrl };
  });
