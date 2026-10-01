import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MeuAcesso = {
  admin: boolean;
  sensei: boolean;
  atleta: boolean;
  sensei_id: string | null;
  /** Área inicial conforme o papel de maior nível. */
  area: "/admin" | "/clube" | "/atleta";
};

export const getMeuAcesso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeuAcesso> => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const { data: vinculo } = await context.supabase
      .from("sensei_users")
      .select("sensei_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const lista = (papeis ?? []).map((p) => p.role as string);
    const admin = lista.includes("admin");
    const senseiId = vinculo?.sensei_id ?? null;
    const sensei = lista.includes("sensei") || !!senseiId;
    const atleta = lista.includes("atleta");

    return {
      admin,
      sensei,
      atleta,
      sensei_id: senseiId,
      area: admin ? "/admin" : sensei ? "/clube" : "/atleta",
    };
  });

const conviteInput = z.object({
  sensei_id: z.string().uuid(),
  /**
   * gerar_link: cria o link de ativação para o admin enviar pelo WhatsApp (não gasta cota de email).
   * enviar_email: dispara o email de convite do próprio sistema.
   */
  acao: z.enum(["gerar_link", "enviar_email"]).optional().default("gerar_link"),
  /** Exigido quando o email já tem conta: vincula o papel sem tocar na senha e sem gerar link. */
  confirmar_vinculo: z.boolean().optional().default(false),
});

export type ResultadoConvite = {
  situacao: "convidado" | "vinculado" | "conta_existente";
  email: string;
  /** Link de ativação só existe para contas novas. Nunca para conta já existente. */
  link: string | null;
};

export const convidarSensei = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => conviteInput.parse(data))
  .handler(async ({ data, context }): Promise<ResultadoConvite> => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(papeis ?? []).some((p) => p.role === "admin")) {
      throw new Error("Apenas administradores podem enviar convites.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sensei } = await supabaseAdmin
      .from("senseis")
      .select("id, email, status")
      .eq("id", data.sensei_id)
      .maybeSingle();

    if (!sensei) throw new Error("Sensei não encontrado.");
    if (!["aprovado", "ativo"].includes(sensei.status)) {
      throw new Error("Só é possível convidar senseis com status aprovado ou ativo.");
    }

    const email = sensei.email.trim().toLowerCase();

    async function vincular(userId: string) {
      const r1 = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "sensei" }, { onConflict: "user_id,role" });
      if (r1.error) throw new Error("Não conseguimos dar o papel de sensei.");
      const r2 = await supabaseAdmin
        .from("sensei_users")
        .upsert({ user_id: userId, sensei_id: data.sensei_id }, { onConflict: "user_id" });
      if (r2.error) throw new Error("Não conseguimos vincular o sensei ao clube.");
    }

    /** Descobre se o email já tem conta sem criar nem gerar nenhum link de acesso. */
    async function idDaContaExistente(): Promise<string | null> {
      const base = process.env["SUPABASE_URL"];
      const chave = process.env["SUPABASE_SERVICE_ROLE_KEY"];
      if (!base || !chave) throw new Error("Configuração do servidor indisponível.");
      const resposta = await fetch(
        `${base}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`,
        { headers: { apikey: chave, Authorization: `Bearer ${chave}` } },
      );
      if (!resposta.ok) {
        throw new Error("Não conseguimos verificar esse email agora. Tente de novo em instantes.");
      }
      const corpo = (await resposta.json()) as { users?: Array<{ id: string; email?: string }> };
      const achado = (corpo.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
      return achado?.id ?? null;
    }

    const existente = await idDaContaExistente();

    if (existente) {
      // Conta de outra pessoa pode estar nesse email: nunca geramos link de entrada nela.
      if (!data.confirmar_vinculo) {
        return { situacao: "conta_existente", email, link: null };
      }
      await vincular(existente);
      return { situacao: "vinculado", email, link: null };
    }

    if (data.acao === "enviar_email") {
      const convite = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      const userId = convite.data?.user?.id;
      if (!userId) {
        throw new Error(
          "Não conseguimos enviar o email de convite agora. Gere o link e envie pelo WhatsApp.",
        );
      }
      await vincular(userId);
      return { situacao: "convidado", email, link: null };
    }

    const gerado = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email });
    const userId = gerado.data?.user?.id;
    const link = gerado.data?.properties?.action_link ?? null;
    if (!userId || !link) {
      throw new Error("Não conseguimos gerar o link de acesso agora. Tente novamente em instantes.");
    }
    await vincular(userId);
    return { situacao: "convidado", email, link };
  });
