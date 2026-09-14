// Helpers server-only para a API do Asaas.

export type AsaasEnv = "sandbox" | "production";

function baseUrl(env: AsaasEnv) {
  return env === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export async function asaasFetch<T>(
  env: AsaasEnv,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) throw new Error("Pagamentos ainda não estão configurados. Fale com a organização.");

  const res = await fetch(`${baseUrl(env)}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      access_token: key,
      "User-Agent": "KarateSparring",
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const errors = (json as { errors?: { description?: string }[] } | null)?.errors;
    const msg = errors?.[0]?.description ?? `Asaas respondeu ${res.status}`;
    console.error("[asaas]", path, res.status, text.slice(0, 500));
    throw new Error(msg);
  }

  return json as T;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function proximoVencimento(dias = 3) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type ConfigAdesao = {
  adesao_total: number;
  adesao_parcela: number;
  adesao_parcela_pix: number;
  adesao_parcelas: number;
};

/**
 * Cria a cobrança da adesão anual do sensei no Asaas.
 * Cartão: parcelado em N x parcela (R$ 150). Pix: mensal com parcela cheia (R$ 200).
 * A adesão fica 100% na conta principal — sem split.
 */
export async function criarAdesaoNoAsaas(
  env: AsaasEnv,
  sensei: { id: string; nome: string; email: string; whatsapp: string },
  cpfCnpj: string,
  billingType: "PIX" | "CREDIT_CARD",
  cfg: ConfigAdesao,
): Promise<{ url: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const cliente = await asaasFetch<{ id: string }>(env, "/customers", {
    method: "POST",
    body: {
      name: sensei.nome,
      email: sensei.email,
      mobilePhone: onlyDigits(sensei.whatsapp),
      cpfCnpj: onlyDigits(cpfCnpj),
      externalReference: `sensei:${sensei.id}`,
      notificationDisabled: false,
    },
  });

  const descricao = `Karate Sparring · adesão sensei · ${sensei.nome}`;
  const primeiro = proximoVencimento(3);
  const parcela = billingType === "CREDIT_CARD" ? cfg.adesao_parcela : cfg.adesao_parcela_pix;
  const total = parcela * cfg.adesao_parcelas;

  let paymentId: string | null = null;
  let subscriptionId: string | null = null;
  let invoiceUrl = "";
  let bruto: unknown = null;

  if (billingType === "CREDIT_CARD") {
    const pag = await asaasFetch<{ id: string; invoiceUrl?: string }>(env, "/payments", {
      method: "POST",
      body: {
        customer: cliente.id,
        billingType: "CREDIT_CARD",
        installmentCount: cfg.adesao_parcelas,
        installmentValue: parcela,
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
        value: parcela,
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
    valor_total: total,
    valor_sensei: 0,
    billing_type: billingType,
    status: "pendente",
    invoice_url: invoiceUrl || null,
    payload: bruto as never,
  });

  await supabaseAdmin
    .from("senseis")
    .update({
      adesao_invoice_url: invoiceUrl || null,
      adesao_asaas_id: subscriptionId ?? paymentId,
    })
    .eq("id", sensei.id);

  if (!invoiceUrl) throw new Error("Cobrança criada, mas o Asaas não retornou o link.");
  return { url: invoiceUrl };
}
