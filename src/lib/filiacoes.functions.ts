import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { proximaSegunda } from "@/lib/semana";

export type FiliacaoAdmin = {
  atleta_id: string;
  nome: string;
  email: string;
  whatsapp: string;
  sensei_id: string | null;
  dojo: string | null;
  cidade: string | null;
  uf: string | null;
  desde: string | null;
  filiacao_id: string | null;
  status: string;
  provedor: string | null;
  motivo: string | null;
  obs: string | null;
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

export const listarFiliacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FiliacaoAdmin[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: atletas }, { data: vinculos }, { data: filiacoes }, { data: senseis }] =
      await Promise.all([
        supabaseAdmin
          .from("atletas")
          .select("id, nome, email, whatsapp")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("atleta_dojos").select("atleta_id, sensei_id, desde").is("ate", null),
        supabaseAdmin
          .from("filiacoes")
          .select("id, atleta_id, status, provedor, motivo, obs, created_at")
          .eq("tipo", "atleta")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("senseis").select("id, dojo, cidade, uf"),
      ]);

    const porAtleta = new Map<string, NonNullable<typeof filiacoes>[number]>();
    for (const f of filiacoes ?? []) {
      if (f.atleta_id && !porAtleta.has(f.atleta_id)) porAtleta.set(f.atleta_id, f);
    }

    return (atletas ?? []).map((a) => {
      const v = (vinculos ?? []).find((x) => x.atleta_id === a.id) ?? null;
      const s = (senseis ?? []).find((x) => x.id === v?.sensei_id) ?? null;
      const f = porAtleta.get(a.id) ?? null;
      return {
        atleta_id: a.id,
        nome: a.nome,
        email: a.email,
        whatsapp: a.whatsapp,
        sensei_id: v?.sensei_id ?? null,
        dojo: s?.dojo ?? null,
        cidade: s?.cidade ?? null,
        uf: s?.uf ?? null,
        desde: v?.desde ?? null,
        filiacao_id: f?.id ?? null,
        status: f?.status ?? "aguardando",
        provedor: f?.provedor ?? null,
        motivo: f?.motivo ?? null,
        obs: f?.obs ?? null,
      };
    });
  });

const statusInput = z.object({
  atleta_id: z.string().uuid(),
  status: z.enum(["ativa", "pausada", "cancelada"]),
  motivo: z.string().trim().max(120).optional().nullable(),
  obs: z.string().trim().max(400).optional().nullable(),
});

export const definirFiliacaoManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vinculo } = await supabaseAdmin
      .from("atleta_dojos")
      .select("sensei_id")
      .eq("atleta_id", data.atleta_id)
      .is("ate", null)
      .maybeSingle();

    const { data: atual } = await supabaseAdmin
      .from("filiacoes")
      .select("id")
      .eq("tipo", "atleta")
      .eq("atleta_id", data.atleta_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const agora = new Date().toISOString();
    const campos = {
      status: data.status,
      motivo: data.motivo?.trim() || null,
      obs: data.obs?.trim() || null,
      decidido_por: context.userId,
      alterada_em: agora,
      sensei_id: vinculo?.sensei_id ?? null,
      ...(data.status === "ativa" ? { ativada_em: agora } : {}),
    };

    const res = atual
      ? await supabaseAdmin.from("filiacoes").update(campos).eq("id", atual.id)
      : await supabaseAdmin.from("filiacoes").insert({
          tipo: "atleta",
          atleta_id: data.atleta_id,
          provedor: "manual",
          ...campos,
        });

    if (res.error) throw new Error("Não conseguimos salvar a filiação.");
    return { ok: true };
  });

const trocaInput = z.object({
  atleta_id: z.string().uuid(),
  sensei_id: z.string().uuid(),
  obs: z.string().trim().max(400).optional().nullable(),
  ignorar_carencia: z.boolean().optional().default(false),
});

export const trocarDojoDoAtleta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => trocaInput.parse(data))
  .handler(async ({ data, context }): Promise<{ vigencia: string }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: atual } = await supabaseAdmin
      .from("atleta_dojos")
      .select("id, sensei_id, desde")
      .eq("atleta_id", data.atleta_id)
      .is("ate", null)
      .maybeSingle();

    if (atual?.sensei_id === data.sensei_id) {
      throw new Error("O atleta já está neste dojô.");
    }

    if (atual?.desde && !data.ignorar_carencia) {
      const dias = Math.floor(
        (Date.now() - new Date(`${atual.desde}T00:00:00`).getTime()) / 86_400_000,
      );
      if (dias < 60) {
        throw new Error(
          `Carência de 60 dias: faltam ${60 - dias} dia(s) para este atleta poder trocar de dojô.`,
        );
      }
    }

    const vigencia = proximaSegunda();

    if (atual) {
      const fecha = await supabaseAdmin
        .from("atleta_dojos")
        .update({ ate: vigencia })
        .eq("id", atual.id);
      if (fecha.error) throw new Error("Não conseguimos encerrar o vínculo atual.");
    }

    const { data: sede } = await supabaseAdmin
      .from("unidades")
      .select("id")
      .eq("clube_id", data.sensei_id)
      .eq("is_sede", true)
      .maybeSingle();

    const novo = await supabaseAdmin.from("atleta_dojos").insert({
      atleta_id: data.atleta_id,
      sensei_id: data.sensei_id,
      unidade_id: sede?.id ?? null,
      desde: vigencia,
      origem: "troca_admin",
      status_autorizacao: "autorizado",
      autorizado_em: new Date().toISOString(),
      autorizado_por: context.userId,
      obs: data.obs?.trim() || null,
    });
    if (novo.error) throw new Error("Não conseguimos registrar o novo dojô.");


    await supabaseAdmin
      .from("filiacoes")
      .update({ sensei_id: data.sensei_id, alterada_em: new Date().toISOString() })
      .eq("tipo", "atleta")
      .eq("atleta_id", data.atleta_id);

    return { vigencia };
  });

const dojoAdminInput = z.object({
  sensei_id: z.string().uuid(),
  raio_metros: z.number().int().min(50).max(2000),
});

export const definirRaioDoDojo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => dojoAdminInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("senseis")
      .update({ raio_metros: data.raio_metros })
      .eq("id", data.sensei_id);
    if (error) throw new Error("Não conseguimos salvar o raio.");
    return { ok: true };
  });
