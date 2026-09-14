import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SituacaoAdesao = {
  encontrado: boolean;
  nome?: string;
  dojo?: string;
  status?: "paga" | "pendente" | "sem_cobranca";
  invoice_url?: string | null;
  cobrancas?: {
    criada_em: string;
    valor_total: number;
    billing_type: string;
    status: string;
    duplicada: boolean;
    invoice_url: string | null;
  }[];
};

const consultaInput = z.object({
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().min(10).max(20),
});

/**
 * Consulta pública protegida: só devolve dados quando email E WhatsApp do cadastro
 * conferem. Nunca expõe links de afiliado nem dados de outros senseis.
 */
export const consultarAdesao = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => consultaInput.parse(data))
  .handler(async ({ data }): Promise<SituacaoAdesao> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digitos = (v: string) => v.replace(/\D/g, "");

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, nome, dojo, whatsapp, adesao_paga, adesao_invoice_url")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (!sensei || digitos(sensei.whatsapp) !== digitos(data.whatsapp)) {
      return { encontrado: false };
    }

    const { data: pags } = await supabaseAdmin
      .from("pagamentos")
      .select("created_at, valor_total, billing_type, status, invoice_url")
      .eq("sensei_id", sensei.id)
      .eq("produto", "adesao")
      .order("created_at", { ascending: true });

    const lista = pags ?? [];
    // A cobrança válida é a primeira ainda em aberto (ou a confirmada).
    const confirmada = lista.find((p) => p.status === "confirmado");
    const primeiraAberta = lista.find((p) => p.status === "pendente");
    const valida = confirmada ?? primeiraAberta ?? null;

    const cobrancas = lista.map((p) => ({
      criada_em: p.created_at,
      valor_total: Number(p.valor_total),
      billing_type: p.billing_type,
      status: p.status,
      duplicada: p !== valida && p.status === "pendente",
      invoice_url: p.invoice_url,
    }));

    const status: "paga" | "pendente" | "sem_cobranca" = sensei.adesao_paga || confirmada
      ? "paga"
      : lista.length
        ? "pendente"
        : "sem_cobranca";

    return {
      encontrado: true,
      nome: sensei.nome,
      dojo: sensei.dojo,
      status,
      invoice_url: valida?.invoice_url ?? sensei.adesao_invoice_url ?? null,
      cobrancas,
    };
  });
