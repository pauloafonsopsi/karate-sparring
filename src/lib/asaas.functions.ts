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
    adesao_total: num("adesao_total", 1800),
    adesao_parcela: num("adesao_parcela", 150),
    adesao_parcela_pix: num("adesao_parcela_pix", 200),
    adesao_parcelas: Math.round(num("adesao_parcelas", 12)),
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
    const { data: papel } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!papel) throw new Error("Apenas administradores podem criar contas de recebimento.");

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
    const { data: papel } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!papel) throw new Error("Apenas administradores podem cobrar a adesão.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { criarAdesaoNoAsaas } = await import("./asaas.server");
    const cfg = await lerConfig();

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, email, whatsapp")
      .eq("id", data.sensei_id)
      .maybeSingle();
    if (!sensei) throw new Error("Sensei não encontrado.");

    return criarAdesaoNoAsaas(cfg.ambiente, sensei, data.cpf_cnpj, data.billing_type, cfg);
  });

/* ---------------- ADESÃO PÚBLICA (o próprio sensei se inscreve) ---------------- */

const adesaoPublicaInput = z.object({
  nome: z.string().trim().min(3).max(120),
  dojo: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(120),
  uf: z.string().trim().length(2),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(160),
  graduacao: z.string().trim().max(40).optional(),
  tempo_ensino: z.string().trim().max(40).optional(),
  instagram: z.string().trim().max(120).optional(),
  cpf_cnpj: z.string().trim().min(11).max(18),
  billing_type: z.enum(["PIX", "CREDIT_CARD"]),
  aceite: z.literal(true),
});

export const criarAdesaoPublica = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adesaoPublicaInput.parse(data))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { criarAdesaoNoAsaas } = await import("./asaas.server");
    const cfg = await lerConfig();

    const email = data.email.toLowerCase();
    const base = {
      nome: data.nome,
      dojo: data.dojo,
      cidade: data.cidade,
      uf: data.uf.toUpperCase(),
      whatsapp: data.whatsapp,
      email,
      graduacao: data.graduacao ?? null,
      tempo_ensino: data.tempo_ensino ?? null,
      instagram: data.instagram ?? null,
    };

    // Segurança: endpoint público. Nunca sobrescreve os dados de um cadastro existente
    // e nunca cobra de novo quem já pagou. Se a adesão está pendente, apenas devolve
    // (ou gera) a cobrança daquele mesmo cadastro.
    const { data: existente } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, email, whatsapp, adesao_paga, adesao_invoice_url")
      .eq("email", email)
      .maybeSingle();

    if (existente) {
      if (existente.adesao_paga) {
        throw new Error("Este email já tem adesão paga. Fale com a organização.");
      }
      if (existente.adesao_invoice_url) return { url: existente.adesao_invoice_url };
      return criarAdesaoNoAsaas(cfg.ambiente, existente, data.cpf_cnpj, data.billing_type, cfg);
    }

    const { data: criado, error } = await supabaseAdmin
      .from("senseis")
      .insert({ ...base, status: "aplicou" })
      .select("id, nome, email, whatsapp, adesao_paga")
      .single();
    if (error || !criado) throw new Error("Não foi possível salvar sua inscrição.");

    return criarAdesaoNoAsaas(cfg.ambiente, criado, data.cpf_cnpj, data.billing_type, cfg);
  });
