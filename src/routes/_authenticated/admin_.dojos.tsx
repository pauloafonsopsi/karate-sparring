import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Badge, Btn, Field, SelectInput, TextInput } from "@/components/kit";
import { MapaAlfinete } from "@/components/mapa-alfinete";
import { TrocaArea } from "@/components/troca-area";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";
import { atualizarMeuDojo, getAtletasDoMeuDojo, getMeuDojo } from "@/lib/dojo.functions";
import { DIAS_SEMANA, FUSOS, nomeDia } from "@/lib/semana";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin_/dojos")({
  head: () => ({
    meta: [
      { title: "Meu dojô · Karate Legends Sparring" },
      { name: "description", content: "Configure seu dojô e acompanhe seus atletas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu dojô · Karate Legends Sparring" },
      { property: "og:description", content: "Configure seu dojô e acompanhe seus atletas." },
    ],
  }),
  component: Dojos,
});

type Form = {
  dojo: string;
  cidade: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  fuso_horario: string;
  dia_aula: number | null;
  horario_aula: string;
  duracao_minutos: number;
};

function Dojos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dojoFn = useServerFn(getMeuDojo);
  const atletasFn = useServerFn(getAtletasDoMeuDojo);
  const salvarFn = useServerFn(atualizarMeuDojo);

  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });
  const { data: dojo, isLoading } = useQuery({ queryKey: ["meu-dojo"], queryFn: () => dojoFn({}) });
  const { data: atletas } = useQuery({
    queryKey: ["atletas-do-dojo"],
    enabled: !!dojo,
    queryFn: () => atletasFn({}),
  });

  const [editando, setEditando] = useState(false);
  const [f, setF] = useState<Form | null>(null);

  useEffect(() => {
    if (!dojo) return;
    setF({
      dojo: dojo.dojo,
      cidade: dojo.cidade,
      endereco: dojo.endereco ?? "",
      latitude: dojo.latitude,
      longitude: dojo.longitude,
      fuso_horario: dojo.fuso_horario,
      dia_aula: dojo.dia_aula,
      horario_aula: (dojo.horario_aula ?? "").slice(0, 5),
      duracao_minutos: dojo.duracao_minutos,
    });
    if (!dojo.onboarding_concluido) setEditando(true);
  }, [dojo]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f) return;
      if (f.latitude == null || f.longitude == null) {
        throw new Error("Marque o alfinete do dojô no mapa.");
      }
      if (!f.dia_aula) throw new Error("Escolha o dia da aula semanal.");
      if (!/^\d{2}:\d{2}$/.test(f.horario_aula)) throw new Error("Informe o horário da aula.");
      await salvarFn({
        data: {
          dojo: f.dojo.trim(),
          cidade: f.cidade.trim(),
          endereco: f.endereco.trim() || null,
          latitude: f.latitude,
          longitude: f.longitude,
          fuso_horario: f.fuso_horario,
          dia_aula: f.dia_aula,
          horario_aula: f.horario_aula,
          duracao_minutos: f.duracao_minutos,
          concluir_onboarding: true,
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meu-dojo"] });
      setEditando(false);
      toast.success("Dados do dojô salvos.");
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar."),
  });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const ativos = (atletas ?? []).filter((a) => a.filiacao === "ativa").length;

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            <TrocaArea acesso={acesso} atual="/admin/dojos" />
            <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
              Sair
            </Btn>
          </div>
        </header>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-fg">Carregando…</p>
        ) : !dojo ? (
          <p className="mt-10 border border-line bg-surface p-6 text-sm text-muted-fg">
            Sua conta ainda não está vinculada a um dojô. Fale com a equipe da liga.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <h1 className="text-2xl">{dojo.dojo}</h1>
              <p className="mt-2 text-sm text-muted-fg">
                {dojo.nome_sensei} · {dojo.cidade}/{dojo.uf}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-line bg-surface p-4">
                  <div className="fight-number text-3xl">{(atletas ?? []).length}</div>
                  <div className="eyebrow mt-1">Atletas no dojô</div>
                </div>
                <div className="border border-line bg-surface p-4">
                  <div className="fight-number text-3xl text-brand">{ativos}</div>
                  <div className="eyebrow mt-1">Filiações ativas</div>
                </div>
              </div>
            </section>

            {!dojo.onboarding_concluido && (
              <p className="mt-6 border border-brand bg-surface p-4 text-sm text-muted-fg">
                Complete os dados do dojô abaixo: endereço, alfinete no mapa, fuso horário e a aula
                semanal.
              </p>
            )}

            <section className="mt-8 border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">Dados do dojô</h2>
                {!editando && (
                  <Btn variant="outline" onClick={() => setEditando(true)}>
                    Editar
                  </Btn>
                )}
              </div>

              {!editando || !f ? (
                <dl className="mt-5 space-y-2 text-sm">
                  {[
                    ["Endereço", dojo.endereco ?? "—"],
                    [
                      "Alfinete",
                      dojo.latitude != null && dojo.longitude != null
                        ? `${dojo.latitude.toFixed(5)}, ${dojo.longitude.toFixed(5)}`
                        : "não marcado",
                    ],
                    ["Raio de validação", `${dojo.raio_metros} m (definido pela liga)`],
                    ["Fuso horário", dojo.fuso_horario],
                    [
                      "Aula semanal",
                      dojo.dia_aula
                        ? `${nomeDia(dojo.dia_aula)} às ${(dojo.horario_aula ?? "").slice(0, 5)} · ${dojo.duracao_minutos} min`
                        : "não definida",
                    ],
                    ["Selo", dojo.selo_status === "neutro" ? "ainda não avaliado" : dojo.selo_status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="eyebrow">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-5 space-y-4">
                  <Field label="Nome do dojô">
                    <TextInput value={f.dojo} onChange={(e) => setF({ ...f, dojo: e.target.value })} />
                  </Field>
                  <Field label="Cidade">
                    <TextInput
                      value={f.cidade}
                      onChange={(e) => setF({ ...f, cidade: e.target.value })}
                    />
                  </Field>
                  <Field label="Endereço">
                    <TextInput
                      value={f.endereco}
                      placeholder="Rua, número, bairro"
                      onChange={(e) => setF({ ...f, endereco: e.target.value })}
                    />
                  </Field>

                  <div>
                    <span className="eyebrow mb-2 block">Alfinete do dojô</span>
                    <MapaAlfinete
                      latitude={f.latitude}
                      longitude={f.longitude}
                      onChange={(lat, lng) => setF({ ...f, latitude: lat, longitude: lng })}
                    />
                  </div>

                  <Field label="Fuso horário">
                    <SelectInput
                      value={f.fuso_horario}
                      onChange={(e) => setF({ ...f, fuso_horario: e.target.value })}
                    >
                      {FUSOS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field label="Dia da aula semanal">
                    <SelectInput
                      value={f.dia_aula ?? ""}
                      onChange={(e) =>
                        setF({ ...f, dia_aula: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">Selecione</option>
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.nome}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field label="Horário de início">
                    <TextInput
                      type="time"
                      value={f.horario_aula}
                      onChange={(e) => setF({ ...f, horario_aula: e.target.value })}
                    />
                  </Field>

                  <Field label="Duração (minutos)">
                    <TextInput
                      type="number"
                      min={30}
                      max={240}
                      value={f.duracao_minutos}
                      onChange={(e) =>
                        setF({ ...f, duracao_minutos: Number(e.target.value) || 90 })
                      }
                    />
                  </Field>

                  <Btn full disabled={salvar.isPending} onClick={() => salvar.mutate()}>
                    {salvar.isPending ? "Salvando" : "Salvar dados do dojô"}
                  </Btn>
                  {dojo.onboarding_concluido && (
                    <Btn full variant="ghost" onClick={() => setEditando(false)}>
                      Cancelar
                    </Btn>
                  )}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-xl">Meus atletas</h2>
              <div className="mt-4 space-y-3">
                {(atletas ?? []).map((a) => {
                  const wa = whatsappLink(
                    a.whatsapp,
                    `Olá ${a.nome.split(" ")[0]}, aqui é do ${dojo.dojo}. Falando sobre o treino da World League.`,
                  );
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-4 border border-line bg-surface p-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold">{a.nome}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-fg">
                          <Badge tone={a.filiacao === "ativa" ? "ativo" : "muted"}>
                            {a.filiacao}
                          </Badge>
                          <span>{a.whatsapp}</span>
                        </div>
                      </div>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <Btn variant="outline">WhatsApp</Btn>
                        </a>
                      )}
                    </div>
                  );
                })}
                {(atletas ?? []).length === 0 && (
                  <p className="border border-line bg-surface p-6 text-sm text-muted-fg">
                    Nenhum atleta cadastrado no seu dojô ainda.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
