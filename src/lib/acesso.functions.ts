import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MeuAcesso = {
  admin: boolean;
  sensei: boolean;
  atleta: boolean;
  sensei_id: string | null;
  /** Área inicial conforme o papel de maior nível. */
  area: "/admin" | "/admin/dojos" | "/atleta";
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
      area: admin ? "/admin" : sensei ? "/admin/dojos" : "/atleta",
    };
  });

const conviteInput = z.object({
  sensei_id: z.string().uuid(),
  /** Exigido pela tela quando o email já tem conta: vincula o papel sem tocar na senha. */
  confirmar_vinculo: z.boolean().optional().default(false),
});

export type ResultadoConvite = {
  situacao: "convidado" | "vinculado" | "conta_existente";
  email: string;
  /** Link de ativação para o admin copiar caso o email não chegue. */
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
      if (r2.error) throw new Error("Não conseguimos vincular o sensei ao dojô.");
    }

    const convite = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (convite.data?.user) {
      await vincular(convite.data.user.id);
      const gerado = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email });
      return {
        situacao: "convidado",
        email,
        link: gerado.data?.properties?.action_link ?? null,
      };
    }

    // O email já tem conta. Nunca mexemos na senha dela.
    const existente = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    const userId = existente.data?.user?.id ?? null;

    if (!userId) {
      throw new Error(
        "Não conseguimos enviar o convite agora. Verifique o email do sensei e tente novamente.",
      );
    }

    if (!data.confirmar_vinculo) {
      return { situacao: "conta_existente", email, link: null };
    }

    await vincular(userId);
    return {
      situacao: "vinculado",
      email,
      link: existente.data?.properties?.action_link ?? null,
    };
  });
