import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Badge, Btn, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { criarAcessoSensei, getMeuAcesso } from "@/lib/acesso.functions";
import { criarCobrancaAdesao, criarSubcontaSensei } from "@/lib/asaas.functions";
import { UFS, maskCep, maskCpf } from "@/lib/ufs";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel · Karate Sparring" },
      { name: "description", content: "Painel de gestão do programa Karate Sparring." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel · Karate Sparring" },
      { property: "og:description", content: "Painel de gestão do programa Karate Sparring." },
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
  link_afiliado_mensal: string | null;
  link_afiliado_avulso: string | null;
  data_adesao: string | null;
  obs: string | null;
  created_at: string | null;
  asaas_account_id: string | null;
  asaas_wallet_id: string | null;
  asaas_status: string | null;
  adesao_paga: boolean;
  adesao_invoice_url: string | null;
  adesao_asaas_id: string | null;
};

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string | null;
  uf: string;
  sensei_id: string | null;
  produto_escolhido: string | null;
  status: string;
  created_at: string | null;
};

type Orfao = {
  id: string;
  sale_id: string | null;
  email_pagador: string | null;
  documento_pagador: string | null;
  payload: unknown;
  created_at: string | null;
};

const ABAS = ["Senseis", "Leads", "Receita", "Conciliação", "Config"] as const;

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(v: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Senseis");
  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });

  useEffect(() => {
    if (acesso && !acesso.admin) void navigate({ to: "/admin/dojos", replace: true });
  }, [acesso, navigate]);

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
          <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
            Sair
          </Btn>
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
          {aba === "Senseis" && <AbaSenseis />}
          {aba === "Leads" && <AbaLeads />}
          {aba === "Receita" && <AbaReceita />}
          {aba === "Conciliação" && <AbaConciliacao />}
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
      convertidos: ls.filter((l) => l.status === "convertido").length,
      orfaos: ls.filter((l) => l.status === "orfao_conciliado").length,
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
                "Leads",
                "Convertidos",
                "Órfãos",
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
                <td className="p-3 font-semibold text-brand">{contar(s.id).convertidos}</td>
                <td className="p-3 text-muted-fg">{contar(s.id).orfaos}</td>
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
  const [f, setF] = useState({
    link_afiliado_mensal: sensei.link_afiliado_mensal ?? "",
    link_afiliado_avulso: sensei.link_afiliado_avulso ?? "",
    foto_url: sensei.foto_url ?? "",
    data_adesao: sensei.data_adesao ?? "",
    obs: sensei.obs ?? "",
  });

  const semConta = !sensei.asaas_wallet_id;

  const [conta, setConta] = useState({
    cpf_cnpj: "",
    nascimento: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    faturamento_mensal: "3000",
  });
  const criarConta = useMutation({
    mutationFn: () =>
      criarSubcontaSensei({
        data: {
          sensei_id: sensei.id,
          cpf_cnpj: conta.cpf_cnpj,
          nascimento: conta.nascimento,
          cep: conta.cep,
          endereco: conta.endereco.trim(),
          numero: conta.numero.trim(),
          bairro: conta.bairro.trim(),
          faturamento_mensal: Number(conta.faturamento_mensal || 0),
        },
      }),
    onSuccess: () => {
      toast.success("Conta de recebimento criada.");
      onSave({});
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a conta."),
  });

  const [adesao, setAdesao] = useState<{ cpf_cnpj: string; billing_type: "PIX" | "CREDIT_CARD" }>({
    cpf_cnpj: "",
    billing_type: "CREDIT_CARD",
  });
  const cobrarAdesao = useMutation({
    mutationFn: () =>
      criarCobrancaAdesao({
        data: {
          sensei_id: sensei.id,
          cpf_cnpj: adesao.cpf_cnpj,
          billing_type: adesao.billing_type,
        },
      }),
    onSuccess: (r: { url: string }) => {
      toast.success("Cobrança da adesão criada.");
      onSave({});
      if (r.url) window.open(r.url, "_blank");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a cobrança."),
  });

  const [acesso, setAcesso] = useState({ email: sensei.email, senha: "" });
  const criarAcesso = useMutation({
    mutationFn: () =>
      criarAcessoSensei({
        data: { sensei_id: sensei.id, email: acesso.email.trim(), senha: acesso.senha },
      }),
    onSuccess: () => {
      setAcesso((a) => ({ ...a, senha: "" }));
      toast.success("Acesso do sensei criado.");
    },
    onError: () => toast.error("Não foi possível criar o acesso."),
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
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 space-y-4">
          <Field label="Link afiliado mensal">
            <TextInput
              value={f.link_afiliado_mensal}
              onChange={(e) => setF({ ...f, link_afiliado_mensal: e.target.value })}
            />
          </Field>
          <Field label="Link afiliado avulso">
            <TextInput
              value={f.link_afiliado_avulso}
              onChange={(e) => setF({ ...f, link_afiliado_avulso: e.target.value })}
            />
          </Field>
          <Field label="Foto (URL)">
            <TextInput
              value={f.foto_url}
              onChange={(e) => setF({ ...f, foto_url: e.target.value })}
            />
          </Field>
          <Field label="Data de adesão">
            <TextInput
              type="date"
              value={f.data_adesao}
              onChange={(e) => setF({ ...f, data_adesao: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <TextInput value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
          </Field>
          <Btn
            full
            variant="outline"
            onClick={() =>
              onSave({
                link_afiliado_mensal: f.link_afiliado_mensal.trim() || null,
                link_afiliado_avulso: f.link_afiliado_avulso.trim() || null,
                foto_url: f.foto_url.trim() || null,
                data_adesao: f.data_adesao || null,
                obs: f.obs.trim() || null,
              })
            }
          >
            Salvar dados
          </Btn>
        </div>

        <div className="mt-8 space-y-3 border-t border-line pt-6">
          {sensei.status === "aplicou" && (
            <Btn full onClick={() => onSave({ status: "aprovado" })}>
              Aprovar
            </Btn>
          )}
          {sensei.status === "aprovado" && (
            <>
              <Btn full disabled={semConta} onClick={() => onSave({ status: "ativo" })}>
                Ativar
              </Btn>
              {semConta && (
                <p className="text-xs text-brand">Crie a conta de recebimento do sensei</p>
              )}
            </>
          )}
          {sensei.status === "ativo" && (
            <Btn full variant="outline" onClick={() => onSave({ status: "inativo" })}>
              Desativar
            </Btn>
          )}
        </div>

        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Conta de recebimento (repasse automático)</p>
          {semConta ? (
            <>
              <Field label="CPF ou CNPJ">
                <TextInput
                  value={conta.cpf_cnpj}
                  inputMode="numeric"
                  onChange={(e) => setConta({ ...conta, cpf_cnpj: maskCpf(e.target.value) })}
                />
              </Field>
              <Field label="Data de nascimento">
                <TextInput
                  type="date"
                  value={conta.nascimento}
                  onChange={(e) => setConta({ ...conta, nascimento: e.target.value })}
                />
              </Field>
              <Field label="CEP">
                <TextInput
                  value={conta.cep}
                  inputMode="numeric"
                  onChange={(e) => setConta({ ...conta, cep: maskCep(e.target.value) })}
                />
              </Field>
              <Field label="Endereço">
                <TextInput
                  value={conta.endereco}
                  onChange={(e) => setConta({ ...conta, endereco: e.target.value })}
                />
              </Field>
              <Field label="Número">
                <TextInput
                  value={conta.numero}
                  onChange={(e) => setConta({ ...conta, numero: e.target.value })}
                />
              </Field>
              <Field label="Bairro">
                <TextInput
                  value={conta.bairro}
                  onChange={(e) => setConta({ ...conta, bairro: e.target.value })}
                />
              </Field>
              <Field label="Faturamento mensal estimado (R$)">
                <TextInput
                  value={conta.faturamento_mensal}
                  inputMode="numeric"
                  onChange={(e) =>
                    setConta({ ...conta, faturamento_mensal: e.target.value.replace(/\D/g, "") })
                  }
                />
              </Field>
              <Btn full disabled={criarConta.isPending} onClick={() => criarConta.mutate()}>
                {criarConta.isPending ? "Criando" : "Criar conta de recebimento"}
              </Btn>
              <p className="text-xs text-muted-fg">
                Sem essa conta o sensei não recebe o repasse e não pode ser ativado.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-fg">
              Conta criada. Repasse automático de R$ 80 (mensal) e R$ 20 (avulso) por atleta.
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Adesão do sensei · R$ 1.800 em 12x de R$ 150</p>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-fg">Adesão paga</span>
            <span>{sensei.adesao_paga ? "sim" : "não"}</span>
          </div>
          {sensei.adesao_invoice_url ? (
            <a
              href={sensei.adesao_invoice_url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-sm text-brand underline"
            >
              Abrir cobrança da adesão
            </a>
          ) : null}
          <Field label="CPF ou CNPJ do sensei (pagador)">
            <TextInput
              value={adesao.cpf_cnpj}
              inputMode="numeric"
              onChange={(e) => setAdesao({ ...adesao, cpf_cnpj: maskCpf(e.target.value) })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["CREDIT_CARD", "Cartão 12x"],
                ["PIX", "Pix mensal"],
              ] as const
            ).map(([valor, label]) => (
              <button
                key={valor}
                onClick={() => setAdesao({ ...adesao, billing_type: valor })}
                className={`border p-3 text-sm ${
                  adesao.billing_type === valor ? "border-brand text-fg" : "border-line text-muted-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Btn
            full
            variant="outline"
            disabled={adesao.cpf_cnpj.replace(/\D/g, "").length < 11 || cobrarAdesao.isPending}
            onClick={() => cobrarAdesao.mutate()}
          >
            {cobrarAdesao.isPending ? "Gerando" : "Gerar cobrança da adesão"}
          </Btn>
        </div>

        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Acesso do sensei ao painel de leads</p>
          <Field label="Email de acesso">
            <TextInput
              type="email"
              value={acesso.email}
              onChange={(e) => setAcesso({ ...acesso, email: e.target.value })}
            />
          </Field>
          <Field label="Senha inicial (mínimo 8 caracteres)">
            <TextInput
              type="text"
              value={acesso.senha}
              onChange={(e) => setAcesso({ ...acesso, senha: e.target.value })}
            />
          </Field>
          <Btn
            full
            variant="outline"
            disabled={acesso.senha.trim().length < 8 || criarAcesso.isPending}
            onClick={() => criarAcesso.mutate()}
          >
            {criarAcesso.isPending ? "Criando" : "Criar acesso"}
          </Btn>
          <p className="text-xs text-muted-fg">
            O sensei entra em /auth com esses dados e vê apenas os leads do dojô dele.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ---------------- LEADS ---------------- */

function AbaLeads() {
  const [uf, setUf] = useState("");
  const [senseiId, setSenseiId] = useState("");
  const [produto, setProduto] = useState("");
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
      (!produto || l.produto_escolhido === produto) &&
      (!status || l.status === status) &&
      (!termo || [l.nome, l.email].some((f) => f.toLowerCase().includes(termo))),
  );

  function exportar() {
    const head = ["nome", "whatsapp", "email", "uf", "cidade", "sensei", "produto", "status", "data"];
    const rows = lista.map((l) => [
      l.nome,
      l.whatsapp,
      l.email,
      l.uf,
      l.cidade ?? "",
      nomeSensei(l.sensei_id),
      l.produto_escolhido ?? "",
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
        <SelectInput
          className="max-w-36"
          value={produto}
          onChange={(e) => setProduto(e.target.value)}
        >
          <option value="">Produto</option>
          <option value="mensal">mensal</option>
          <option value="avulso">avulso</option>
        </SelectInput>
        <SelectInput className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          {["lead", "convertido", "orfao_conciliado"].map((s) => (
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
              {["Nome", "WhatsApp", "Email", "UF", "Sensei", "Produto", "Status", "Data"].map((h) => (
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
                <td className="p-3 text-muted-fg">{l.produto_escolhido ?? "—"}</td>
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

/* ---------------- CONCILIAÇÃO ---------------- */

function AbaConciliacao() {
  const qc = useQueryClient();
  const [alvo, setAlvo] = useState<Orfao | null>(null);
  const [busca, setBusca] = useState("");

  const { data: orfaos } = useQuery({
    queryKey: ["admin-orfaos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos_orfaos")
        .select("*")
        .eq("conciliado", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Orfao[];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["conciliacao-leads", busca],
    enabled: !!alvo && busca.trim().length > 1,
    queryFn: async () => {
      const t = `%${busca.trim()}%`;
      const { data, error } = await supabase
        .from("leads_atletas")
        .select("id, nome, email, uf, status")
        .or(`nome.ilike.${t},email.ilike.${t}`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const vincular = useMutation({
    mutationFn: async ({ orfao, leadId }: { orfao: Orfao; leadId: string }) => {
      const e1 = await supabase
        .from("leads_atletas")
        .update({
          status: "convertido",
          greenn_sale_id: orfao.sale_id,
          convertido_em: new Date().toISOString(),
        })
        .eq("id", leadId);
      if (e1.error) throw e1.error;
      const e2 = await supabase
        .from("pagamentos_orfaos")
        .update({ conciliado: true, lead_id: leadId })
        .eq("id", orfao.id);
      if (e2.error) throw e2.error;
    },
    onSuccess: async () => {
      setAlvo(null);
      setBusca("");
      await qc.invalidateQueries({ queryKey: ["admin-orfaos"] });
      await qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Pagamento conciliado.");
    },
    onError: () => toast.error("Não foi possível conciliar."),
  });

  return (
    <div className="space-y-3">
      {(orfaos ?? []).length === 0 && (
        <p className="border border-line bg-surface p-6 text-sm text-muted-fg">
          Nenhum pagamento pendente de conciliação.
        </p>
      )}
      {(orfaos ?? []).map((o) => (
        <div key={o.id} className="border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold">{o.email_pagador ?? "sem email"}</div>
              <div className="mt-1 text-xs text-muted-fg">
                venda {o.sale_id ?? "—"} · {dataBr(o.created_at)} · doc{" "}
                {o.documento_pagador ?? "—"}
              </div>
              <pre className="mt-3 max-h-24 overflow-auto border border-line bg-background p-2 text-[11px] text-muted-fg">
                {JSON.stringify(o.payload, null, 1).slice(0, 600)}
              </pre>
            </div>
            <Btn variant="outline" onClick={() => setAlvo(o)}>
              Vincular a lead
            </Btn>
          </div>

          {alvo?.id === o.id && (
            <div className="mt-4 border-t border-line pt-4">
              <Field label="Buscar lead por nome ou email">
                <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} />
              </Field>
              <div className="mt-3 space-y-2">
                {(leads ?? []).map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-line p-3 text-sm"
                  >
                    <span>
                      {l.nome} · <span className="text-muted-fg">{l.email}</span> ·{" "}
                      <Badge tone={l.status}>{l.status}</Badge>
                    </span>
                    <Btn onClick={() => vincular.mutate({ orfao: o, leadId: l.id })}>Vincular</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
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

  const producao = data?.get("asaas_ambiente") === "production";

  return (
    <div className="max-w-xl space-y-4">
      {toggle("modo_piloto", "Modo piloto")}
      {toggle("inscricoes_abertas", "Inscrições abertas")}

      <div className="mt-8 space-y-4 border-t border-line pt-6">
        <p className="eyebrow">Pagamentos dos atletas</p>
        <ValorConfig
          chave="preco_mensal"
          label="Preço mensal (R$)"
          atual={data?.get("preco_mensal") ?? "100"}
          onSalvar={(valor) => set.mutate({ chave: "preco_mensal", valor })}
        />
        <ValorConfig
          chave="repasse_mensal"
          label="Repasse ao sensei no mensal (R$)"
          atual={data?.get("repasse_mensal") ?? "80"}
          onSalvar={(valor) => set.mutate({ chave: "repasse_mensal", valor })}
        />
        <ValorConfig
          chave="preco_avulso"
          label="Preço avulso (R$)"
          atual={data?.get("preco_avulso") ?? "30"}
          onSalvar={(valor) => set.mutate({ chave: "preco_avulso", valor })}
        />
        <ValorConfig
          chave="repasse_avulso"
          label="Repasse ao sensei no avulso (R$)"
          atual={data?.get("repasse_avulso") ?? "20"}
          onSalvar={(valor) => set.mutate({ chave: "repasse_avulso", valor })}
        />
        <p className="eyebrow pt-4">Adesão do sensei</p>
        <ValorConfig
          chave="adesao_total"
          label="Valor total da adesão (R$)"
          atual={data?.get("adesao_total") ?? "1800"}
          onSalvar={(valor) => set.mutate({ chave: "adesao_total", valor })}
        />
        <ValorConfig
          chave="adesao_parcela"
          label="Parcela no cartão (R$)"
          atual={data?.get("adesao_parcela") ?? "150"}
          onSalvar={(valor) => set.mutate({ chave: "adesao_parcela", valor })}
        />
        <ValorConfig
          chave="adesao_parcela_pix"
          label="Parcela no Pix mensal (R$)"
          atual={data?.get("adesao_parcela_pix") ?? "200"}
          onSalvar={(valor) => set.mutate({ chave: "adesao_parcela_pix", valor })}
        />
        <ValorConfig
          chave="adesao_parcelas"
          label="Número de parcelas"
          atual={data?.get("adesao_parcelas") ?? "12"}
          onSalvar={(valor) => set.mutate({ chave: "adesao_parcelas", valor })}
        />
        <div className="flex items-center justify-between border border-line bg-surface p-4">
          <span className="text-sm">
            Cobranças reais {producao ? "ligadas" : "desligadas (modo de teste)"}
          </span>
          <button
            onClick={() =>
              set.mutate({
                chave: "asaas_ambiente",
                valor: producao ? "sandbox" : "production",
              })
            }
            className={`h-7 w-12 border ${producao ? "border-brand bg-brand" : "border-line"}`}
          />
        </div>
      </div>
    </div>
  );
}

function ValorConfig({
  chave,
  label,
  atual,
  onSalvar,
}: {
  chave: string;
  label: string;
  atual: string;
  onSalvar: (valor: string) => void;
}) {
  const [v, setV] = useState<string | null>(null);
  const valor = v ?? atual;
  return (
    <div key={chave} className="flex items-end gap-3">
      <div className="flex-1">
        <Field label={label}>
          <TextInput
            value={valor}
            inputMode="numeric"
            onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </Field>
      </div>
      <Btn variant="outline" onClick={() => onSalvar(valor.trim())}>
        Salvar
      </Btn>
    </div>
  );
}
