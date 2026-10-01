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
import { SITE_HOST } from "@/lib/config";
import {
  atualizarMinhaUnidade,
  autorizarAtleta,
  definirMinhaMensalidade,
  getMeuClube,
  listarAtletasDoMeuClube,
  recusarAtleta,
  type AtletaDoClube,
  type ResultadoAutorizacao,
} from "@/lib/clube.functions";
import { brl } from "@/lib/preco";
import { DIAS_SEMANA, FUSOS, nomeDia } from "@/lib/semana";

export const Route = createFileRoute("/_authenticated/clube")({
  head: () => ({
    meta: [
      { title: "Meu clube · Karate Legends Sparring" },
      { name: "description", content: "Gestão do seu clube licenciado na World League." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu clube · Karate Legends Sparring" },
      { property: "og:description", content: "Gestão do seu clube licenciado na World League." },
    ],
  }),
  component: AreaClube,
});

const ABAS = ["Atletas", "Unidade", "Mensalidade"] as const;

function AreaClube() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const clubeFn = useServerFn(getMeuClube);
  const atletasFn = useServerFn(listarAtletasDoMeuClube);
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Atletas");

  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });
  const { data: clube, isLoading } = useQuery({
    queryKey: ["meu-clube"],
    queryFn: () => clubeFn({}),
  });
  const { data: atletas } = useQuery({
    queryKey: ["atletas-do-clube"],
    queryFn: () => atletasFn({}),
  });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link = clube ? siteUrl(`/c/${clube.slug}`) : "";

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            <TrocaArea acesso={acesso} atual="/clube" />
            <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
              Sair
            </Btn>
          </div>
        </header>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-fg">Carregando…</p>
        ) : !clube ? (
          <p className="mt-10 border border-line bg-surface p-6 text-sm text-muted-fg">
            Sua conta ainda não está vinculada a um clube licenciado. Fale com a liga.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl">{clube.clube}</h1>
                <Badge tone={clube.status === "ativo" ? "ativo" : "muted"}>{clube.status}</Badge>
                {clube.piloto && <Badge tone="aprovado">piloto</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-fg">
                {clube.responsavel} · {clube.cidade}/{clube.uf}
              </p>
            </section>

            <section className="mt-6 border border-line bg-surface p-6">
              <p className="eyebrow">Link do clube</p>
              {clube.link_publico_ativo ? (
                <>
                  <p className="mt-3 text-sm break-all">{link}</p>
                  <Btn
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      void navigator.clipboard.writeText(link);
                      toast.success("Link copiado. Envie para seus alunos.");
                    }}
                  >
                    Copiar link
                  </Btn>
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                  Seu link público é publicado quando a liga aprova o clube
                  {clube.piloto ? "." : " e a conta de recebimento é aprovada."}
                </p>
              )}
            </section>

            <nav className="mt-8 flex gap-5 border-b border-line">
              {ABAS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  className={`eyebrow pb-3 ${a === aba ? "border-b-2 border-brand text-foreground" : "text-muted-fg"}`}
                >
                  {a}
                </button>
              ))}
            </nav>

            <div className="mt-8">
              {aba === "Atletas" && <AbaAtletas atletas={atletas ?? []} />}
              {aba === "Unidade" && <AbaUnidade clube={clube} />}
              {aba === "Mensalidade" && <AbaMensalidade clube={clube} />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function AbaAtletas({ atletas }: { atletas: AtletaDoClube[] }) {
  const qc = useQueryClient();
  const autorizarFn = useServerFn(autorizarAtleta);
  const recusarFn = useServerFn(recusarAtleta);
  const [aviso, setAviso] = useState<ResultadoAutorizacao | null>(null);

  const autorizar = useMutation({
    mutationFn: (vinculo_id: string) => autorizarFn({ data: { vinculo_id } }),
    onSuccess: (r) => {
      setAviso(r);
      void qc.invalidateQueries({ queryKey: ["atletas-do-clube"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos autorizar agora."),
  });

  const recusar = useMutation({
    mutationFn: (vinculo_id: string) => recusarFn({ data: { vinculo_id, motivo: null } }),
    onSuccess: () => {
      toast.success("Pedido recusado.");
      void qc.invalidateQueries({ queryKey: ["atletas-do-clube"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos recusar agora."),
  });

  const pendentes = atletas.filter((a) => a.status_autorizacao === "pendente");
  const autorizados = atletas.filter((a) => a.status_autorizacao === "autorizado");
  const atrasados = pendentes.filter((a) => a.horas_esperando >= 72);

  function avisarNoWhatsapp(r: ResultadoAutorizacao) {
    const numero = r.whatsapp.replace(/\D/g, "");
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(r.mensagem)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="space-y-8">
      {aviso && (
        <div className="border border-brand bg-surface p-6">
          <p className="eyebrow text-brand">Atleta autorizado</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-fg">
            {aviso.nome} foi autorizado
            {aviso.cortesia_piloto
              ? " e já está com a filiação de cortesia do piloto ativa."
              : "."}{" "}
            Avise no WhatsApp para ele concluir os próximos passos.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn onClick={() => avisarNoWhatsapp(aviso)}>Avisar no WhatsApp</Btn>
            <Btn variant="ghost" className="px-0" onClick={() => setAviso(null)}>
              Fechar
            </Btn>
          </div>
        </div>
      )}

      {atrasados.length > 0 && (
        <div className="border border-brand/60 bg-surface p-5">
          <p className="eyebrow text-brand">Parados há mais de 72 horas</p>
          <p className="mt-2 text-sm text-muted-fg">
            {atrasados.length} {atrasados.length === 1 ? "pedido" : "pedidos"} esperando sua
            decisão.
          </p>
        </div>
      )}

      <section>
        <p className="eyebrow mb-4">Aguardando autorização ({pendentes.length})</p>
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-fg">Nenhum pedido em aberto.</p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((a) => (
              <div
                key={a.vinculo_id}
                className={`border bg-surface p-4 ${a.horas_esperando >= 72 ? "border-brand" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="display text-base">{a.nome}</p>
                    <p className="mt-1 text-xs text-muted-fg">
                      {a.whatsapp} · {a.faixa ?? "faixa não informada"}
                      {a.unidade ? ` · ${a.unidade}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-fg">
                      esperando há {a.horas_esperando}h
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      disabled={autorizar.isPending}
                      onClick={() => autorizar.mutate(a.vinculo_id)}
                    >
                      Autorizar
                    </Btn>
                    <Btn
                      variant="outline"
                      disabled={recusar.isPending}
                      onClick={() => recusar.mutate(a.vinculo_id)}
                    >
                      Recusar
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-4">Atletas do clube ({autorizados.length})</p>
        {autorizados.length === 0 ? (
          <p className="text-sm text-muted-fg">Nenhum atleta autorizado ainda.</p>
        ) : (
          <div className="space-y-2">
            {autorizados.map((a) => (
              <div
                key={a.vinculo_id}
                className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-4"
              >
                <div>
                  <p className="display text-base">{a.nome}</p>
                  <p className="mt-1 text-xs text-muted-fg">
                    {a.whatsapp} · {a.faixa ?? "faixa não informada"}
                    {a.unidade ? ` · ${a.unidade}` : ""}
                  </p>
                </div>
                <Badge tone={a.filiacao === "ativa" ? "ativo" : "muted"}>{a.filiacao}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type Clube = NonNullable<Awaited<ReturnType<typeof getMeuClube>>>;

function AbaUnidade({ clube }: { clube: Clube }) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(atualizarMinhaUnidade);
  const [unidadeId, setUnidadeId] = useState(clube.unidades[0]?.id ?? "");
  const atual = clube.unidades.find((u) => u.id === unidadeId) ?? clube.unidades[0];

  const [f, setF] = useState({
    nome: atual?.nome ?? "",
    endereco: atual?.endereco ?? "",
    latitude: atual?.latitude ?? null,
    longitude: atual?.longitude ?? null,
    fuso_horario: atual?.fuso_horario ?? "America/Sao_Paulo",
    dia_aula: atual?.dia_aula ?? null,
    horario_aula: (atual?.horario_aula ?? "").slice(0, 5),
    duracao_minutos: atual?.duracao_minutos ?? 90,
  });

  useEffect(() => {
    if (!atual) return;
    setF({
      nome: atual.nome,
      endereco: atual.endereco ?? "",
      latitude: atual.latitude,
      longitude: atual.longitude,
      fuso_horario: atual.fuso_horario,
      dia_aula: atual.dia_aula,
      horario_aula: (atual.horario_aula ?? "").slice(0, 5),
      duracao_minutos: atual.duracao_minutos,
    });
  }, [atual?.id]);

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          unidade_id: unidadeId,
          nome: f.nome.trim(),
          endereco: f.endereco.trim() || null,
          latitude: f.latitude,
          longitude: f.longitude,
          fuso_horario: f.fuso_horario,
          dia_aula: f.dia_aula,
          horario_aula: /^\d{2}:\d{2}$/.test(f.horario_aula) ? f.horario_aula : null,
          duracao_minutos: f.duracao_minutos,
          concluir_onboarding: true,
        },
      }),
    onSuccess: () => {
      toast.success("Dados da unidade salvos.");
      void qc.invalidateQueries({ queryKey: ["meu-clube"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar agora."),
  });

  if (!atual) return <p className="text-sm text-muted-fg">Nenhuma unidade cadastrada.</p>;

  return (
    <div className="space-y-4">
      {clube.unidades.length > 1 && (
        <Field label="Unidade">
          <SelectInput value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
            {clube.unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
                {u.is_sede ? " (sede)" : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      <Field label="Nome da unidade">
        <TextInput value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Field>
      <Field label="Endereço">
        <TextInput value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} />
      </Field>

      <div>
        <span className="eyebrow mb-2 block">Alfinete do dojô</span>
        <MapaAlfinete
          latitude={f.latitude}
          longitude={f.longitude}
          onChange={(lat, lng) => setF({ ...f, latitude: lat, longitude: lng })}
        />
      </div>

      <Field label="Dia do treino">
        <SelectInput
          value={f.dia_aula ?? ""}
          onChange={(e) => setF({ ...f, dia_aula: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Selecione</option>
          {DIAS_SEMANA.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.nome}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Horário">
        <TextInput
          value={f.horario_aula}
          type="time"
          onChange={(e) => setF({ ...f, horario_aula: e.target.value })}
        />
      </Field>
      <Field label="Duração (minutos)">
        <TextInput
          value={String(f.duracao_minutos)}
          inputMode="numeric"
          onChange={(e) =>
            setF({ ...f, duracao_minutos: Number(e.target.value.replace(/\D/g, "")) || 0 })
          }
        />
      </Field>
      <Field label="Fuso horário">
        <SelectInput
          value={f.fuso_horario}
          onChange={(e) => setF({ ...f, fuso_horario: e.target.value })}
        >
          {FUSOS.map((z) => (
            <option key={z} value={z}>
              {z.replace("America/", "").replace("_", " ")}
            </option>
          ))}
        </SelectInput>
      </Field>

      <p className="text-xs text-muted-fg">
        Treino atual: {nomeDia(atual.dia_aula)}
        {atual.horario_aula ? ` às ${atual.horario_aula.slice(0, 5)}` : ""} · raio de check-in de{" "}
        {atual.raio_metros} m (definido pela liga).
      </p>

      <Btn full disabled={salvar.isPending} onClick={() => salvar.mutate()}>
        {salvar.isPending ? "Salvando" : "Salvar unidade"}
      </Btn>
    </div>
  );
}

function AbaMensalidade({ clube }: { clube: Clube }) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(definirMinhaMensalidade);
  const [reais, setReais] = useState(
    String(((clube.mensalidade_centavos ?? clube.mensalidade_sugerida_centavos) / 100).toFixed(0)),
  );

  const centavos = Math.round(Number(reais.replace(/\D/g, "")) * 100);

  const salvar = useMutation({
    mutationFn: () => salvarFn({ data: { mensalidade_centavos: centavos } }),
    onSuccess: () => {
      toast.success("Mensalidade salva.");
      void qc.invalidateQueries({ queryKey: ["meu-clube"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar agora."),
  });

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-fg">
        Você escolhe quanto cobra dos seus alunos pela turma de sparring. O mínimo da liga é{" "}
        {brl(clube.mensalidade_minima_centavos)} e a referência sugerida é{" "}
        {brl(clube.mensalidade_sugerida_centavos)} por quatro aulas no mês.
      </p>

      <Field label="Mensalidade do clube (R$)">
        <TextInput
          value={reais}
          inputMode="numeric"
          onChange={(e) => setReais(e.target.value.replace(/\D/g, ""))}
        />
      </Field>

      <div className="border border-line bg-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-fg">Mensalidade do clube</span>
          <span>{brl(centavos)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-muted-fg">Filiação à liga</span>
          <span className={clube.piloto ? "text-brand" : ""}>
            {clube.piloto ? "cortesia no piloto" : brl(clube.filiacao_liga_centavos)}
          </span>
        </div>
        {!clube.piloto && (
          <div className="mt-3 flex items-end justify-between gap-4 border-t border-line pt-3">
            <span className="eyebrow">O atleta vê</span>
            <span className="fight-number text-xl">
              {brl(centavos + clube.filiacao_liga_centavos)}
            </span>
          </div>
        )}
      </div>

      <Btn full disabled={salvar.isPending} onClick={() => salvar.mutate()}>
        {salvar.isPending ? "Salvando" : "Salvar mensalidade"}
      </Btn>
    </div>
  );
}
