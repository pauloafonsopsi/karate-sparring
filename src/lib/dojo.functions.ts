import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MeuDojo = {
  id: string;
  nome_sensei: string;
  dojo: string;
  cidade: string;
  uf: string;
  status: string;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_metros: number;
  fuso_horario: string;
  dia_aula: number | null;
  horario_aula: string | null;
  duracao_minutos: number;
  selo_status: string;
  onboarding_concluido: boolean;
};

export type AtletaDoDojo = {
  id: string;
  nome: string;
  whatsapp: string;
  filiacao: string;
  desde: string;
};

async function senseiIdDoUsuario(
  supabase: { from: (t: "sensei_users") => any },
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("sensei_users")
    .select("sensei_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.sensei_id) throw new Error("Sua conta ainda não está vinculada a um dojô.");
  return data.sensei_id as string;
}

export const getMeuDojo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeuDojo | null> => {
    const { data: vinculo } = await context.supabase
      .from("sensei_users")
      .select("sensei_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!vinculo?.sensei_id) return null;

    const { data, error } = await context.supabase
      .from("senseis")
      .select(
        "id, nome, dojo, cidade, uf, status, endereco, latitude, longitude, raio_metros, fuso_horario, dia_aula, horario_aula, duracao_minutos, selo_status, onboarding_concluido",
      )
      .eq("id", vinculo.sensei_id)
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      nome_sensei: data.nome,
      dojo: data.dojo,
      cidade: data.cidade,
      uf: data.uf,
      status: data.status,
      endereco: data.endereco,
      latitude: data.latitude,
      longitude: data.longitude,
      raio_metros: data.raio_metros,
      fuso_horario: data.fuso_horario,
      dia_aula: data.dia_aula,
      horario_aula: data.horario_aula,
      duracao_minutos: data.duracao_minutos,
      selo_status: data.selo_status,
      onboarding_concluido: data.onboarding_concluido,
    };
  });

/**
 * Lista fechada de campos que o sensei pode alterar. Nunca inclui status,
 * piloto, raio_metros ou qualquer campo de aprovação.
 */
const dojoInput = z.object({
  dojo: z.string().trim().min(2).max(120),
  endereco: z.string().trim().max(240).nullable(),
  cidade: z.string().trim().min(2).max(120),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  fuso_horario: z.string().trim().min(3).max(60),
  dia_aula: z.number().int().min(1).max(7).nullable(),
  horario_aula: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  duracao_minutos: z.number().int().min(30).max(240),
  concluir_onboarding: z.boolean().optional().default(false),
});

export const atualizarMeuDojo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => dojoInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const senseiId = await senseiIdDoUsuario(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: atual } = await supabaseAdmin
      .from("senseis")
      .select("latitude, longitude")
      .eq("id", senseiId)
      .maybeSingle();

    const patch = {
      dojo: data.dojo,
      endereco: data.endereco?.trim() || null,
      cidade: data.cidade,
      latitude: data.latitude,
      longitude: data.longitude,
      fuso_horario: data.fuso_horario,
      dia_aula: data.dia_aula,
      horario_aula: data.horario_aula,
      duracao_minutos: data.duracao_minutos,
      ...(data.concluir_onboarding ? { onboarding_concluido: true } : {}),
    };

    const { error } = await supabaseAdmin.from("senseis").update(patch).eq("id", senseiId);
    if (error) throw new Error("Não conseguimos salvar os dados do dojô.");

    const mudouAlfinete =
      (atual?.latitude ?? null) !== data.latitude || (atual?.longitude ?? null) !== data.longitude;
    if (mudouAlfinete) {
      await supabaseAdmin.from("dojo_alfinete_historico").insert({
        sensei_id: senseiId,
        latitude_antiga: atual?.latitude ?? null,
        longitude_antiga: atual?.longitude ?? null,
        latitude_nova: data.latitude,
        longitude_nova: data.longitude,
        alterado_por: context.userId,
      });
    }

    return { ok: true };
  });

/** O sensei vê apenas nome, WhatsApp e situação da filiação dos seus atletas. */
export const getAtletasDoMeuDojo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AtletaDoDojo[]> => {
    const { data: vinculo } = await context.supabase
      .from("sensei_users")
      .select("sensei_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!vinculo?.sensei_id) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vinculos } = await supabaseAdmin
      .from("atleta_dojos")
      .select("atleta_id, desde")
      .eq("sensei_id", vinculo.sensei_id)
      .is("ate", null);

    const ids = (vinculos ?? []).map((v) => v.atleta_id);
    if (ids.length === 0) return [];

    const [{ data: perfis }, { data: filiacoes }] = await Promise.all([
      supabaseAdmin.from("atletas").select("id, nome, whatsapp").in("id", ids),
      supabaseAdmin
        .from("filiacoes")
        .select("atleta_id, status, created_at")
        .eq("tipo", "atleta")
        .in("atleta_id", ids)
        .order("created_at", { ascending: false }),
    ]);

    const statusPorAtleta = new Map<string, string>();
    for (const f of filiacoes ?? []) {
      if (f.atleta_id && !statusPorAtleta.has(f.atleta_id)) {
        statusPorAtleta.set(f.atleta_id, f.status);
      }
    }

    return (perfis ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      whatsapp: p.whatsapp,
      filiacao: statusPorAtleta.get(p.id) ?? "aguardando",
      desde: (vinculos ?? []).find((v) => v.atleta_id === p.id)?.desde ?? "",
    }));
  });
