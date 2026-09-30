import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Badge, Btn, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { criarAcessoSensei, getMeuAcesso } from "@/lib/acesso.functions";
import { UFS } from "@/lib/ufs";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin")({
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

const ABAS = ["Senseis", "Leads", "Config"] as const;

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
    foto_url: sensei.foto_url ?? "",
    obs: sensei.obs ?? "",
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
            onClick={() =>
              onSave({
                foto_url: f.foto_url.trim() || null,
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
