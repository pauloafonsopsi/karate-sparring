import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MeuAcesso = {
  admin: boolean;
  sensei_id: string | null;
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

    return {
      admin: (papeis ?? []).some((p) => p.role === "admin"),
      sensei_id: vinculo?.sensei_id ?? null,
    };
  });

const acessoInput = z.object({
  sensei_id: z.string().uuid(),
  email: z.string().trim().email().max(160),
  senha: z.string().min(8).max(72),
});

export const criarAcessoSensei = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => acessoInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: papeis } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(papeis ?? []).some((p) => p.role === "admin")) {
      throw new Error("Apenas administradores podem criar acessos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const criado = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
    });

    let userId = criado.data.user?.id ?? null;

    if (!userId) {
      const lista = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const achado = (lista.data?.users ?? []).find(
        (u) => (u.email ?? "").toLowerCase() === email,
      );
      if (!achado) throw new Error(criado.error?.message ?? "Não foi possível criar o acesso.");
      userId = achado.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.senha });
    }

    const r1 = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "sensei" }, { onConflict: "user_id,role" });
    if (r1.error) throw new Error(r1.error.message);

    const r2 = await supabaseAdmin
      .from("sensei_users")
      .upsert({ user_id: userId, sensei_id: data.sensei_id }, { onConflict: "user_id" });
    if (r2.error) throw new Error(r2.error.message);

    return { ok: true };
  });
