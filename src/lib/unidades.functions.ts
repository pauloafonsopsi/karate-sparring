import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UnidadeAdmin = {
  id: string;
  clube_id: string;
  nome: string;
  is_sede: boolean;
  ativa: boolean;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_metros: number;
  fuso_horario: string;
  dia_aula: number | null;
  horario_aula: string | null;
  duracao_minutos: number;
};

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(data ?? []).some((p: { role: string }) => p.role === "admin")) {
    throw new Error("Apenas administradores podem fazer isso.");
  }
}

export const listarUnidadesDoClube = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ clube_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<UnidadeAdmin[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: unidades } = await supabaseAdmin
      .from("unidades")
      .select(
        "id, clube_id, nome, is_sede, ativa, endereco, latitude, longitude, raio_metros, fuso_horario, dia_aula, horario_aula, duracao_minutos",
      )
      .eq("clube_id", data.clube_id)
      .order("is_sede", { ascending: false });
    return (unidades ?? []) as UnidadeAdmin[];
  });

export const criarUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        clube_id: z.string().uuid(),
        nome: z.string().trim().min(2).max(80),
        endereco: z.string().trim().max(240).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clube } = await supabaseAdmin
      .from("senseis")
      .select("fuso_horario, raio_metros")
      .eq("id", data.clube_id)
      .maybeSingle();
    if (!clube) throw new Error("Clube não encontrado.");

    const { data: nova, error } = await supabaseAdmin
      .from("unidades")
      .insert({
        clube_id: data.clube_id,
        nome: data.nome,
        endereco: data.endereco?.trim() || null,
        fuso_horario: clube.fuso_horario,
        raio_metros: clube.raio_metros,
      })
      .select("id")
      .single();
    if (error) throw new Error("Não conseguimos criar a unidade.");
    return { id: nova.id };
  });

export const definirRaioDaUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        unidade_id: z.string().uuid(),
        raio_metros: z.number().int().min(50).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("unidades")
      .update({ raio_metros: data.raio_metros })
      .eq("id", data.unidade_id);
    if (error) throw new Error("Não conseguimos salvar o raio.");
    return { ok: true };
  });

export const definirSlugDoClube = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        clube_id: z.string().uuid(),
        slug: z
          .string()
          .trim()
          .min(3)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existente } = await supabaseAdmin
      .from("senseis")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existente && existente.id !== data.clube_id) {
      throw new Error("Este endereço já está em uso por outro clube.");
    }

    const { error } = await supabaseAdmin
      .from("senseis")
      .update({ slug: data.slug })
      .eq("id", data.clube_id);
    if (error) throw new Error("Não conseguimos salvar o endereço do clube.");
    return { ok: true };
  });

export const definirRecebedorEAnuidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        clube_id: z.string().uuid(),
        recebedor_status: z
          .enum(["pendente", "em_analise", "aprovada", "recusada", "dispensada_piloto"])
          .optional(),
        anuidade_status: z.enum(["pendente", "paga", "isento_piloto", "estornada"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      recebedor_status?: string;
      anuidade_iniciada_em?: string;
      anuidade_status?: string;
    } = {};
    if (data.recebedor_status) {
      patch.recebedor_status = data.recebedor_status;
      if (data.recebedor_status === "aprovada") {
        patch.anuidade_iniciada_em = new Date().toISOString();
      }
    }
    if (data.anuidade_status) patch.anuidade_status = data.anuidade_status;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("senseis").update(patch).eq("id", data.clube_id);

    if (error) throw new Error("Não conseguimos salvar a situação financeira do clube.");
    return { ok: true };
  });
