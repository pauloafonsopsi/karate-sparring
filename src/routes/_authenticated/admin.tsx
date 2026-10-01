import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AbaAcessos } from "@/components/admin/aba-acessos";
import { AbaAtletas } from "@/components/admin/aba-atletas";
import { AbaConfig } from "@/components/admin/aba-config";
import { EditorUnidade } from "@/components/admin/editor-unidade";
import { NovoClube } from "@/components/admin/novo-clube";
import { Wordmark } from "@/components/brand";
import { Badge, Btn, Field, SelectInput, TextInput } from "@/components/kit";
import { TrocaArea } from "@/components/troca-area";
import { supabase } from "@/integrations/supabase/client";
import { convidarSensei, getMeuAcesso, type ResultadoConvite } from "@/lib/acesso.functions";
import { atualizarClubeAdmin } from "@/lib/admin.functions";
import { SITE_HOST } from "@/lib/config";
import { baixarCsv } from "@/lib/csv";
import { UFS } from "@/lib/ufs";
import {
  definirFiliacaoManual,
  definirRaioDoDojo,
  listarFiliacoes,
  trocarDojoDoAtleta,
} from "@/lib/filiacoes.functions";
import { brl } from "@/lib/preco";
import { nomeDia } from "@/lib/semana";
import {
  criarUnidade,
  definirSlugDoClube,
  definirRecebedorEAnuidade,
  listarUnidadesDoClube,
} from "@/lib/unidades.functions";

import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const acesso = await getMeuAcesso();
    if (!acesso.admin) throw redirect({ to: acesso.area, replace: true });
  },
  head: () => ({
    meta: [
      { title: "Painel · Karate Legends Sparring" },
      { name: "description", content: "Painel de gestão da World League." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel · Karate Legends Sparring" },
      { property: "og:description", content: "Painel de gestão da World League." },
    ],
  }),
  component: Admin,
});

type Sensei = {
  id: string;
  nome: string;
  dojo: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  email: string;
  graduacao: string | null;
  tempo_ensino: string | null;
  instagram: string | null;
  foto_url: string | null;
  status: string;
  piloto: boolean;
  obs: string | null;
  created_at: string | null;
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
  slug: string;
  mensalidade_centavos: number | null;
  recebedor_status: string;
  anuidade_status: string;
  link_publico_ativo: boolean | null;
};


type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string | null;
  uf: string;
  sensei_id: string | null;
  status: string;
  created_at: string | null;
};

const ABAS = ["Clubes", "Atletas", "Filiações", "Leads", "Acessos", "Config"] as const;

function dataBr(v: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Clubes");
  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            <TrocaArea acesso={acesso} atual="/admin" />
            <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
              Sair
            </Btn>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          {ABAS.map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`eyebrow border px-4 py-2.5 ${
                aba === a ? "border-brand text-brand" : "border-line hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {aba === "Clubes" && <AbaSenseis />}
          {aba === "Atletas" && <AbaAtletas />}
          {aba === "Filiações" && <AbaFiliacoes />}
          {aba === "Leads" && <AbaLeads />}
          {aba === "Acessos" && <AbaAcessos />}
          {aba === "Config" && <AbaConfig />}
        </div>
      </div>
    </main>
  );
}

/* ---------------- SENSEIS ---------------- */

function AbaSenseis() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Sensei | null>(null);
  const [novo, setNovo] = useState(false);

  const { data: senseis } = useQuery({
    queryKey: ["admin-senseis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senseis")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sensei[];
    },
  });

  const { data: leadsResumo } = useQuery({
    queryKey: ["admin-leads-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_atletas")
        .select("id, sensei_id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contar = (senseiId: string) => {
    const ls = (leadsResumo ?? []).filter((l) => l.sensei_id === senseiId);
    return {
      total: ls.length,
    };
  };

  const salvar = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Sensei> }) => {
      const { error } = await supabase.from("senseis").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({ queryKey: ["admin-senseis"] });
      setAberto((prev) => (prev ? { ...prev, ...vars.patch } : prev));
      toast.success("Salvo.");
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const termo = busca.trim().toLowerCase();
  const lista = (senseis ?? []).filter(
    (s) =>
      (!status || s.status === status) &&
      (!termo ||
        [s.nome, s.dojo, s.uf, s.cidade].some((f) => f.toLowerCase().includes(termo))),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <SelectInput
          className="max-w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {["aplicou", "aprovado", "ativo", "inativo"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
        <TextInput
          className="max-w-64"
          placeholder="Buscar nome, dojô ou UF"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Btn onClick={() => setNovo(true)}>+ Novo clube</Btn>
        <Btn
          variant="outline"
          onClick={() =>
            baixarCsv(
              "clubes-karate-legends",
              [
                "dojo",
                "sensei",
                "email",
                "whatsapp",
                "cidade",
                "uf",
                "status",
                "piloto",
                "mensalidade",
                "link",
                "aplicou_em",
              ],
              lista.map((s) => [
                s.dojo,
                s.nome,
                s.email,
                s.whatsapp,
                s.cidade,
                s.uf,
                s.status,
                s.piloto ? "sim" : "não",
                brl(s.mensalidade_centavos),
                s.link_publico_ativo ? `${SITE_HOST}/c/${s.slug}` : "",
                dataBr(s.created_at),
              ]),
            )
          }
        >
          Exportar CSV
        </Btn>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              {[
                "Nome",
                "Dojô",
                "Cidade/UF",
                "Status",
                "Piloto",
                "Pré-inscrições",
                "Aplicou em",
                "Contato",
              ].map((h) => (
                <th key={h} className="eyebrow p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr
                key={s.id}
                onClick={() => setAberto(s)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-surface"
              >
                <td className="p-3 font-semibold">{s.nome}</td>
                <td className="p-3 text-muted-fg">{s.dojo}</td>
                <td className="p-3 text-muted-fg">
                  {s.cidade}/{s.uf}
                </td>
                <td className="p-3">
                  <Badge tone={s.status}>{s.status}</Badge>
                </td>
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      salvar.mutate({ id: s.id, patch: { piloto: !s.piloto } });
                    }}
                    className={`h-6 w-11 border ${s.piloto ? "border-brand bg-brand" : "border-line"}`}
                  />
                </td>
                <td className="p-3 font-semibold">{contar(s.id).total}</td>
                <td className="p-3 text-muted-fg">{dataBr(s.created_at)}</td>
                <td className="p-3">
                  {whatsappLink(s.whatsapp) && (
                    <a
                      href={whatsappLink(s.whatsapp)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="eyebrow border border-line px-3 py-2 hover:border-foreground/40"
                    >
                      WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-fg">
                  Nenhum sensei encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {novo && <NovoClube onClose={() => setNovo(false)} />}

      {aberto && (
        <PainelSensei
          sensei={aberto}
          onClose={() => setAberto(null)}
          onSave={(patch) => salvar.mutate({ id: aberto.id, patch })}
        />
      )}
    </div>
  );
}

function PainelSensei({
  sensei,
  onClose,
  onSave,
}: {
  sensei: Sensei;
  onClose: () => void;
  onSave: (patch: Partial<Sensei>) => void;
}) {
  const qc = useQueryClient();
  const salvarClubeFn = useServerFn(atualizarClubeAdmin);
  const [f, setF] = useState({
    dojo: sensei.dojo,
    nome: sensei.nome,
    email: sensei.email,
    whatsapp: sensei.whatsapp,
    cidade: sensei.cidade,
    uf: sensei.uf,
    graduacao: sensei.graduacao ?? "",
    tempo_ensino: sensei.tempo_ensino ?? "",
    instagram: sensei.instagram ?? "",
    mensalidade: sensei.mensalidade_centavos
      ? (sensei.mensalidade_centavos / 100).toFixed(2).replace(".", ",")
      : "",
    foto_url: sensei.foto_url ?? "",
    obs: sensei.obs ?? "",
  });

  const salvarClube = useMutation({
    mutationFn: () => {
      const bruto = f.mensalidade.trim();
      let centavos: number | null = null;
      if (bruto) {
        const n = Number(bruto.replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(n)) throw new Error("Mensalidade inválida.");
        centavos = Math.round(n * 100);
      }
      return salvarClubeFn({
        data: {
          clube_id: sensei.id,
          dojo: f.dojo.trim(),
          nome: f.nome.trim(),
          email: f.email.trim(),
          whatsapp: f.whatsapp.trim(),
          cidade: f.cidade.trim(),
          uf: f.uf,
          graduacao: f.graduacao.trim() || null,
          tempo_ensino: f.tempo_ensino.trim() || null,
          instagram: f.instagram.trim() || null,
          mensalidade_centavos: centavos,
          foto_url: f.foto_url.trim() || null,
          obs: f.obs.trim() || null,
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-senseis"] });
      toast.success("Dados do clube salvos.");
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar o clube."),
  });

  const convidarFn = useServerFn(convidarSensei);
  const [contaExistente, setContaExistente] = useState(false);
  const [linkAtivacao, setLinkAtivacao] = useState<string | null>(null);

  const convidar = useMutation({
    mutationFn: (v: { acao: "gerar_link" | "enviar_email"; confirmar_vinculo: boolean }) =>
      convidarFn({
        data: { sensei_id: sensei.id, acao: v.acao, confirmar_vinculo: v.confirmar_vinculo },
      }),
    onSuccess: (r: ResultadoConvite) => {
      setLinkAtivacao(r.link);
      if (r.situacao === "conta_existente") {
        setContaExistente(true);
        toast.info("Este email já tem conta. Confirme para dar o papel de sensei a ela.");
        return;
      }
      setContaExistente(false);
      toast.success(
        r.situacao === "vinculado"
          ? `Papel de sensei vinculado à conta de ${r.email}.`
          : r.link
            ? "Link de acesso gerado. Copie e envie para o sensei."
            : `Convite enviado para ${r.email}. O sensei define a própria senha.`,
      );
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o convite."),
  });
  const wa = whatsappLink(sensei.whatsapp);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80">
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl">{sensei.nome}</h2>
            <p className="mt-1 text-sm text-muted-fg">
              {sensei.dojo} · {sensei.cidade}/{sensei.uf}
            </p>
          </div>
          <Btn variant="ghost" className="px-0" onClick={onClose}>
            Fechar
          </Btn>
        </div>

        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 block">
            <Btn full variant="outline">
              Falar no WhatsApp
            </Btn>
          </a>
        )}

        <dl className="mt-6 space-y-2 border-y border-line py-4 text-sm">
          {[
            ["Status", sensei.status],
            ["Email", sensei.email],
            ["WhatsApp", sensei.whatsapp],
            ["Graduação", sensei.graduacao ?? "—"],
            ["Tempo de ensino", sensei.tempo_ensino ?? "—"],
            ["Instagram", sensei.instagram ?? "—"],
            ["Piloto", sensei.piloto ? "sim" : "não"],
            ["Aplicou em", dataBr(sensei.created_at)],
            ["Endereço", sensei.endereco ?? "—"],
            [
              "Alfinete",
              sensei.latitude != null && sensei.longitude != null
                ? `${sensei.latitude.toFixed(5)}, ${sensei.longitude.toFixed(5)}`
                : "não marcado",
            ],
            ["Fuso horário", sensei.fuso_horario],
            [
              "Aula semanal",
              sensei.dia_aula
                ? `${nomeDia(sensei.dia_aula)} às ${(sensei.horario_aula ?? "").slice(0, 5)} · ${sensei.duracao_minutos} min`
                : "não definida",
            ],
            ["Onboarding", sensei.onboarding_concluido ? "concluído" : "pendente"],
            ["Selo", sensei.selo_status === "neutro" ? "ainda não avaliado" : sensei.selo_status],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <RaioDoDojo sensei={sensei} />

        <GestaoClube sensei={sensei} />


        <div className="mt-6 space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Dados do clube</p>
          <Field label="Nome do dojô">
            <TextInput value={f.dojo} onChange={(e) => setF({ ...f, dojo: e.target.value })} />
          </Field>
          <Field label="Sensei responsável">
            <TextInput value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </Field>
          <Field label="Email" hint="É o email de acesso ao painel do clube.">
            <TextInput
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp">
            <TextInput
              value={f.whatsapp}
              onChange={(e) => setF({ ...f, whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Cidade">
            <TextInput value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
          </Field>
          <Field label="UF">
            <SelectInput value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value })}>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Graduação">
            <TextInput
              value={f.graduacao}
              onChange={(e) => setF({ ...f, graduacao: e.target.value })}
            />
          </Field>
          <Field label="Tempo de ensino">
            <TextInput
              value={f.tempo_ensino}
              onChange={(e) => setF({ ...f, tempo_ensino: e.target.value })}
            />
          </Field>
          <Field label="Instagram">
            <TextInput
              value={f.instagram}
              onChange={(e) => setF({ ...f, instagram: e.target.value })}
            />
          </Field>
          <Field label="Mensalidade do clube (R$)" hint="Deixe vazio se o clube ainda não definiu.">
            <TextInput
              inputMode="decimal"
              value={f.mensalidade}
              onChange={(e) => setF({ ...f, mensalidade: e.target.value })}
            />
          </Field>
          <Field label="Foto (URL)">
            <TextInput
              value={f.foto_url}
              onChange={(e) => setF({ ...f, foto_url: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <TextInput value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
          </Field>
          <Btn
            full
            variant="outline"
            disabled={salvarClube.isPending}
            onClick={() => salvarClube.mutate()}
          >
            {salvarClube.isPending ? "Salvando" : "Salvar dados do clube"}
          </Btn>
        </div>

        <div className="mt-8 space-y-3 border-t border-line pt-6">
          {sensei.status === "aplicou" && (
            <Btn full onClick={() => onSave({ status: "aprovado" })}>
              Aprovar
            </Btn>
          )}
          {sensei.status === "aprovado" && (
            <Btn full onClick={() => onSave({ status: "ativo" })}>
              Ativar
            </Btn>
          )}
          {sensei.status === "ativo" && (
            <Btn full variant="outline" onClick={() => onSave({ status: "inativo" })}>
              Desativar
            </Btn>
          )}
        </div>

        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Acesso do sensei ao painel do dojô</p>
          <p className="text-sm text-muted-fg">
            O acesso é de <span className="text-foreground">{sensei.email}</span> e o próprio sensei
            define a senha. Nenhuma senha é alterada por aqui.
          </p>
          <Btn
            full
            disabled={
              convidar.isPending || !["aprovado", "ativo"].includes(sensei.status) || contaExistente
            }
            onClick={() => convidar.mutate({ acao: "gerar_link", confirmar_vinculo: false })}
          >
            {convidar.isPending ? "Gerando" : "Gerar link de acesso"}
          </Btn>
          <Btn
            full
            variant="outline"
            disabled={
              convidar.isPending || !["aprovado", "ativo"].includes(sensei.status) || contaExistente
            }
            onClick={() => convidar.mutate({ acao: "enviar_email", confirmar_vinculo: false })}
          >
            Enviar por email
          </Btn>
          <p className="text-xs text-muted-fg">
            O link é o caminho recomendado: pode ser enviado pelo WhatsApp e não consome a cota de
            emails do sistema.
          </p>
          {!["aprovado", "ativo"].includes(sensei.status) && (
            <p className="text-xs text-brand">
              Aprove o sensei antes de enviar o convite de acesso.
            </p>
          )}
          {contaExistente && (
            <div className="space-y-3 border border-brand p-4">
              <p className="text-sm">
                Já existe uma conta com este email. Confirmar dá a ela o papel de sensei deste dojô,
                sem mexer na senha.
              </p>
              <div className="flex gap-2">
                <Btn
                  disabled={convidar.isPending}
                  onClick={() =>
                    convidar.mutate({ acao: "gerar_link", confirmar_vinculo: true })
                  }
                >
                  Confirmar vínculo
                </Btn>
                <Btn variant="ghost" onClick={() => setContaExistente(false)}>
                  Cancelar
                </Btn>
              </div>
            </div>
          )}
          {linkAtivacao && (
            <Field label="Link de acesso" hint="Envie pelo WhatsApp. Vale uma única vez.">
              <TextInput readOnly value={linkAtivacao} onFocus={(e) => e.target.select()} />
            </Field>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- LEADS ---------------- */

function AbaLeads() {
  const [uf, setUf] = useState("");
  const [senseiId, setSenseiId] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");

  const { data: senseis } = useQuery({
    queryKey: ["senseis-nomes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("senseis").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_atletas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const nomeSensei = (id: string | null) =>
    (senseis ?? []).find((s) => s.id === id)?.nome ?? "—";

  const termo = busca.trim().toLowerCase();
  const lista = (leads ?? []).filter(
    (l) =>
      (!uf || l.uf === uf) &&
      (!senseiId || l.sensei_id === senseiId) &&
      (!status || l.status === status) &&
      (!termo || [l.nome, l.email].some((f) => f.toLowerCase().includes(termo))),
  );

  function exportar() {
    const head = ["nome", "whatsapp", "email", "uf", "cidade", "sensei", "status", "data"];
    const rows = lista.map((l) => [
      l.nome,
      l.whatsapp,
      l.email,
      l.uf,
      l.cidade ?? "",
      nomeSensei(l.sensei_id),
      l.status,
      dataBr(l.created_at),
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-karate-sparring.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <SelectInput className="max-w-28" value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">UF</option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          className="max-w-52"
          value={senseiId}
          onChange={(e) => setSenseiId(e.target.value)}
        >
          <option value="">Todos os senseis</option>
          {(senseis ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </SelectInput>
        <SelectInput className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          {["lead", "convertido"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
        <TextInput
          className="max-w-56"
          placeholder="Buscar nome ou email"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Btn variant="outline" onClick={exportar}>
          Exportar CSV
        </Btn>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              {["Nome", "WhatsApp", "Email", "UF", "Sensei", "Status", "Data"].map((h) => (
                <th key={h} className="eyebrow p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="p-3 font-semibold">{l.nome}</td>
                <td className="p-3 text-muted-fg">{l.whatsapp}</td>
                <td className="p-3 text-muted-fg">{l.email}</td>
                <td className="p-3 text-muted-fg">{l.uf}</td>
                <td className="p-3 text-muted-fg">{nomeSensei(l.sensei_id)}</td>
                <td className="p-3">
                  <Badge tone={l.status}>{l.status}</Badge>
                </td>
                <td className="p-3 text-muted-fg">{dataBr(l.created_at)}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-fg">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- CONFIG ---------------- */

function AbaConfig() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config").select("chave, valor");
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.chave, r.valor ?? ""]));
    },
  });


  const set = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase.from("config").update({ valor }).eq("chave", chave);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-config"] });
      await qc.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configuração atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar."),
  });

  const toggle = (chave: string, label: string) => {
    const ativo = data?.get(chave) !== "false";
    return (
      <div className="flex items-center justify-between border border-line bg-surface p-4">
        <span className="text-sm">{label}</span>
        <button
          onClick={() => set.mutate({ chave, valor: ativo ? "false" : "true" })}
          className={`h-7 w-12 border ${ativo ? "border-brand bg-brand" : "border-line"}`}
        />
      </div>
    );
  };

  return (
    <div className="max-w-xl space-y-4">
      {toggle("modo_piloto", "Modo piloto")}
      {toggle("inscricoes_abertas", "Inscrições abertas")}
    </div>
  );
}

function RaioDoDojo({ sensei }: { sensei: Sensei }) {
  const qc = useQueryClient();
  const salvarRaio = useServerFn(definirRaioDoDojo);
  const [raio, setRaio] = useState(String(sensei.raio_metros));

  const salvar = useMutation({
    mutationFn: () => salvarRaio({ data: { sensei_id: sensei.id, raio_metros: Number(raio) } }),
    onSuccess: () => {
      toast.success("Raio atualizado.");
      void qc.invalidateQueries({ queryKey: ["admin-senseis"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar o raio."),
  });

  return (
    <div className="mt-6 border-t border-line pt-6">
      <Field label="Raio do check-in (metros)" hint="Somente o admin altera o raio. De 50 a 2000.">
        <div className="flex gap-2">
          <TextInput value={raio} inputMode="numeric" onChange={(e) => setRaio(e.target.value)} />
          <Btn disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            Salvar
          </Btn>
        </div>
      </Field>
    </div>
  );
}

const RECEBEDOR = ["pendente", "em_analise", "aprovada", "recusada", "dispensada_piloto"] as const;
const ANUIDADE = ["pendente", "paga", "isento_piloto", "estornada"] as const;

function GestaoClube({ sensei }: { sensei: Sensei }) {
  const qc = useQueryClient();
  const listar = useServerFn(listarUnidadesDoClube);
  const criar = useServerFn(criarUnidade);
  const salvarSlug = useServerFn(definirSlugDoClube);
  const salvarFin = useServerFn(definirRecebedorEAnuidade);

  const [slug, setSlug] = useState(sensei.slug);
  const [novaUnidade, setNovaUnidade] = useState("");

  const { data: unidades } = useQuery({
    queryKey: ["unidades-admin", sensei.id],
    queryFn: () => listar({ data: { clube_id: sensei.id } }),
  });

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: ["unidades-admin", sensei.id] });
    void qc.invalidateQueries({ queryKey: ["admin-senseis"] });
  };

  const mSlug = useMutation({
    mutationFn: () => salvarSlug({ data: { clube_id: sensei.id, slug: slug.trim() } }),
    onSuccess: () => {
      toast.success("Endereço do clube salvo.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar o endereço."),
  });

  const mUnidade = useMutation({
    mutationFn: () =>
      criar({ data: { clube_id: sensei.id, nome: novaUnidade.trim(), endereco: null } }),
    onSuccess: () => {
      toast.success("Unidade criada.");
      setNovaUnidade("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos criar a unidade."),
  });

  const mFin = useMutation({
    mutationFn: (patch: {
      recebedor_status?: (typeof RECEBEDOR)[number];
      anuidade_status?: (typeof ANUIDADE)[number];
    }) => salvarFin({ data: { clube_id: sensei.id, ...patch } }),
    onSuccess: () => {
      toast.success("Situação do clube salva.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar agora."),
  });

  return (
    <div className="mt-6 space-y-6 border-t border-line pt-6">
      <div>
        <p className="eyebrow mb-3">Clube licenciado</p>
        <p className="text-xs text-muted-fg">
          Link público:{" "}
          {sensei.link_publico_ativo
            ? `${SITE_HOST}/c/${sensei.slug}`
            : "ainda não publicado"}
          {" · "}
          mensalidade do clube: {brl(sensei.mensalidade_centavos)}
        </p>
      </div>

      <Field
        label="Endereço do link (/c/...)"
        hint="Trocar o endereço quebra links já compartilhados."
      >
        <div className="flex gap-2">
          <TextInput
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          />
          <Btn disabled={mSlug.isPending} onClick={() => mSlug.mutate()}>
            Salvar
          </Btn>
        </div>
      </Field>

      <div>
        <Field label="Conta de recebimento do clube">
          <SelectInput
            value={sensei.recebedor_status}
            onChange={(e) =>
              mFin.mutate({ recebedor_status: e.target.value as (typeof RECEBEDOR)[number] })
            }
          >
            {RECEBEDOR.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="mt-4">
          <Field label="Anuidade do clube">
            <SelectInput
              value={sensei.anuidade_status}
              onChange={(e) =>
                mFin.mutate({ anuidade_status: e.target.value as (typeof ANUIDADE)[number] })
              }
            >
              {ANUIDADE.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Unidades ({(unidades ?? []).length})</p>
        <div className="space-y-2">
          {(unidades ?? []).map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-line p-3 text-sm"
            >
              <span>
                {u.nome}
                {u.is_sede ? " (sede)" : ""}
                <span className="block text-xs text-muted-fg">
                  {u.dia_aula ? nomeDia(u.dia_aula) : "dia não definido"} · raio {u.raio_metros} m
                </span>
              </span>
              <Badge tone={u.ativa ? "ativo" : "muted"}>{u.ativa ? "ativa" : "inativa"}</Badge>
            </div>
          ))}
        </div>
        <Field label="Nova unidade">
          <div className="mt-3 flex gap-2">
            <TextInput
              value={novaUnidade}
              placeholder="Nome da unidade"
              onChange={(e) => setNovaUnidade(e.target.value)}
            />
            <Btn
              disabled={mUnidade.isPending || novaUnidade.trim().length < 2}
              onClick={() => mUnidade.mutate()}
            >
              Criar
            </Btn>
          </div>
        </Field>
      </div>
    </div>
  );
}


const STATUS_FILIACAO = ["ativa", "pausada", "cancelada"] as const;

function AbaFiliacoes() {
  const qc = useQueryClient();
  const listar = useServerFn(listarFiliacoes);
  const definir = useServerFn(definirFiliacaoManual);
  const trocar = useServerFn(trocarDojoDoAtleta);

  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [novoDojo, setNovoDojo] = useState("");

  const { data: linhas, isLoading } = useQuery({
    queryKey: ["filiacoes-admin"],
    queryFn: () => listar({}),
  });

  const { data: dojos } = useQuery({
    queryKey: ["senseis-para-troca"],
    queryFn: async () => {
      const { data } = await supabase
        .from("senseis")
        .select("id, dojo, cidade, uf")
        .order("dojo", { ascending: true });
      return data ?? [];
    },
  });

  const recarregar = () => void qc.invalidateQueries({ queryKey: ["filiacoes-admin"] });

  const mudarStatus = useMutation({
    mutationFn: (v: { atleta_id: string; status: (typeof STATUS_FILIACAO)[number] }) =>
      definir({ data: { ...v, motivo: motivo.trim() || null, obs: null } }),
    onSuccess: () => {
      toast.success("Filiação atualizada.");
      setMotivo("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar a filiação."),
  });

  const mudarDojo = useMutation({
    mutationFn: (v: { atleta_id: string; sensei_id: string }) => trocar({ data: v }),
    onSuccess: (r: { vigencia: string }) => {
      toast.success(`Troca registrada. Vale a partir de ${dataBr(r.vigencia)}.`);
      setNovoDojo("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos trocar o dojô."),
  });

  const termo = busca.trim().toLowerCase();
  const lista = (linhas ?? []).filter(
    (l) =>
      !termo ||
      l.nome.toLowerCase().includes(termo) ||
      l.email.toLowerCase().includes(termo) ||
      (l.dojo ?? "").toLowerCase().includes(termo),
  );

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Field label="Buscar">
          <TextInput
            value={busca}
            placeholder="Nome, email ou dojô"
            onChange={(e) => setBusca(e.target.value)}
          />
        </Field>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-fg">Carregando</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-fg">Nenhum atleta com conta ainda.</p>
      ) : (
        <div className="divide-y divide-line border border-line">
          {lista.map((l) => {
            const aberto = sel === l.atleta_id;
            return (
              <div key={l.atleta_id} className="p-4">
                <button
                  className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                  onClick={() => setSel(aberto ? null : l.atleta_id)}
                >
                  <div>
                    <p className="font-semibold">{l.nome}</p>
                    <p className="text-sm text-muted-fg">
                      {l.dojo ? `${l.dojo} · ${l.cidade}/${l.uf}` : "sem dojô"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge>{l.status}</Badge>
                    {l.provedor && <span className="eyebrow">{l.provedor}</span>}
                  </div>
                </button>

                {aberto && (
                  <div className="mt-5 space-y-5 border-t border-line pt-5">
                    <dl className="space-y-2 text-sm">
                      {[
                        ["Email", l.email],
                        ["WhatsApp", l.whatsapp],
                        ["No dojô desde", dataBr(l.desde)],
                        ["Motivo", l.motivo ?? "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <dt className="eyebrow">{k}</dt>
                          <dd className="text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="max-w-sm space-y-3">
                      <Field label="Motivo (opcional)" hint="Ex.: cortesia do piloto.">
                        <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FILIACAO.map((s) => (
                          <Btn
                            key={s}
                            variant={l.status === s ? "primary" : "outline"}
                            disabled={mudarStatus.isPending}
                            onClick={() => mudarStatus.mutate({ atleta_id: l.atleta_id, status: s })}
                          >
                            {s === "ativa" ? "Ativar" : s === "pausada" ? "Pausar" : "Cancelar"}
                          </Btn>
                        ))}
                      </div>
                    </div>

                    <div className="max-w-sm space-y-3">
                      <Field
                        label="Trocar de dojô"
                        hint="Carência de 60 dias. Passa a valer na próxima segunda."
                      >
                        <SelectInput
                          value={novoDojo}
                          onChange={(e) => setNovoDojo(e.target.value)}
                        >
                          <option value="">Selecione o novo dojô</option>
                          {(dojos ?? [])
                            .filter((d) => d.id !== l.sensei_id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.dojo} · {d.cidade}/{d.uf}
                              </option>
                            ))}
                        </SelectInput>
                      </Field>
                      <Btn
                        variant="outline"
                        disabled={!novoDojo || mudarDojo.isPending}
                        onClick={() =>
                          mudarDojo.mutate({ atleta_id: l.atleta_id, sensei_id: novoDojo })
                        }
                      >
                        Confirmar troca
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
