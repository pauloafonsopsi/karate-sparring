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
