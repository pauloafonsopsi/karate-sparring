import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import {
  atualizarAtletaAdmin,
  definirUnidadeDoAtleta,
  excluirAtletaAdmin,
  listarAtletasAdmin,
  type AtletaAdmin,
} from "@/lib/admin.functions";
import { baixarCsv } from "@/lib/csv";
import { FAIXAS, type Faixa } from "@/lib/faixas";
import { definirFiliacaoManual } from "@/lib/filiacoes.functions";
import { listarUnidadesDoClube } from "@/lib/unidades.functions";
import { whatsappLink } from "@/lib/whatsapp";

function dataBr(v: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

export function AbaAtletas() {
  const [busca, setBusca] = useState("");
  const [clube, setClube] = useState("");
  const [faixa, setFaixa] = useState("");
  const [aberto, setAberto] = useState<AtletaAdmin | null>(null);

  const { data: atletas, isLoading } = useQuery({
    queryKey: ["admin-atletas"],
    queryFn: () => listarAtletasAdmin(),
  });

  const clubes = Array.from(
    new Map(
      (atletas ?? [])
        .filter((a) => a.clube_id)
        .map((a) => [a.clube_id!, a.clube ?? "—"] as const),
    ),
  );

  const termo = busca.trim().toLowerCase();
  const lista = (atletas ?? []).filter(
    (a) =>
      (!clube || a.clube_id === clube) &&
      (!faixa || a.faixa === faixa) &&
      (!termo ||
        [a.nome, a.email, a.whatsapp].some((c) => (c ?? "").toLowerCase().includes(termo))),
  );

  function exportar() {
    baixarCsv(
      "atletas-karate-legends",
      ["nome", "email", "whatsapp", "nascimento", "faixa", "clube", "unidade", "filiacao", "cadastro"],
      lista.map((a) => [
        a.nome,
        a.email,
        a.whatsapp,
        dataBr(a.data_nascimento),
        a.faixa ?? "",
        a.clube ?? "",
        a.unidade ?? "",
        a.filiacao,
        dataBr(a.created_at),
      ]),
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <TextInput
          className="max-w-64"
          placeholder="Buscar nome, email ou WhatsApp"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <SelectInput className="max-w-52" value={clube} onChange={(e) => setClube(e.target.value)}>
          <option value="">Todos os clubes</option>
          {clubes.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </SelectInput>
        <SelectInput className="max-w-44" value={faixa} onChange={(e) => setFaixa(e.target.value)}>
          <option value="">Todas as faixas</option>
          {FAIXAS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </SelectInput>
        <Btn variant="outline" onClick={exportar}>
          Exportar CSV
        </Btn>
      </div>

      <p className="mb-3 text-sm text-muted-fg">
        {isLoading ? "Carregando" : `${lista.length} atleta(s)`}
      </p>

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              {["Nome", "Faixa", "WhatsApp", "Clube / unidade", "Pedido", "Filiação", "Cadastro"].map(
                (h) => (
                  <th key={h} className="eyebrow p-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr
                key={a.id}
                onClick={() => setAberto(a)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-surface"
              >
                <td className="p-3 font-semibold">{a.nome}</td>
                <td className="p-3 text-muted-fg">{a.faixa ?? "—"}</td>
                <td className="p-3 text-muted-fg">{a.whatsapp}</td>
                <td className="p-3 text-muted-fg">
                  {a.clube ?? "sem clube"}
                  {a.unidade ? ` · ${a.unidade}` : ""}
                </td>
                <td className="p-3">
                  <Badge tone={a.status_autorizacao === "autorizado" ? "ativo" : "muted"}>
                    {a.status_autorizacao ?? "—"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge tone={a.filiacao === "ativa" ? "ativo" : "muted"}>{a.filiacao}</Badge>
                </td>
                <td className="p-3 text-muted-fg">{dataBr(a.created_at)}</td>
              </tr>
            ))}
            {!isLoading && lista.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-fg">
                  Nenhum atleta encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aberto && <PainelAtleta atleta={aberto} onClose={() => setAberto(null)} />}
    </div>
  );
}

function PainelAtleta({ atleta, onClose }: { atleta: AtletaAdmin; onClose: () => void }) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(atualizarAtletaAdmin);
  const excluirFn = useServerFn(excluirAtletaAdmin);
  const unidadeFn = useServerFn(definirUnidadeDoAtleta);
  const filiacaoFn = useServerFn(definirFiliacaoManual);
  const listarUnidades = useServerFn(listarUnidadesDoClube);

  const [f, setF] = useState({
    nome: atleta.nome,
    whatsapp: atleta.whatsapp,
    faixa: atleta.faixa ?? "",
    data_nascimento: atleta.data_nascimento,
    aceite_marketing_eventos: atleta.aceite_marketing_eventos,
  });
  const [unidade, setUnidade] = useState(atleta.unidade_id ?? "");
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const { data: unidades } = useQuery({
    queryKey: ["unidades-admin", atleta.clube_id],
    queryFn: () => listarUnidades({ data: { clube_id: atleta.clube_id! } }),
    enabled: !!atleta.clube_id,
  });

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: ["admin-atletas"] });
    void qc.invalidateQueries({ queryKey: ["filiacoes-admin"] });
  };

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          atleta_id: atleta.id,
          nome: f.nome.trim(),
          whatsapp: f.whatsapp.trim(),
          faixa: (f.faixa || null) as Faixa | null,
          data_nascimento: f.data_nascimento,
          aceite_marketing_eventos: f.aceite_marketing_eventos,
        },
      }),
    onSuccess: () => {
      toast.success("Dados do atleta salvos.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar."),
  });

  const mudarUnidade = useMutation({
    mutationFn: () => unidadeFn({ data: { atleta_id: atleta.id, unidade_id: unidade } }),
    onSuccess: () => {
      toast.success("Unidade do atleta atualizada.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos trocar a unidade."),
  });

  const mudarFiliacao = useMutation({
    mutationFn: (status: "ativa" | "pausada" | "cancelada") =>
      filiacaoFn({
        data: { atleta_id: atleta.id, status, motivo: motivo.trim() || null, obs: null },
      }),
    onSuccess: () => {
      toast.success("Filiação atualizada.");
      setMotivo("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar a filiação."),
  });

  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { atleta_id: atleta.id } }),
    onSuccess: () => {
      toast.success("Cadastro excluído.");
      recarregar();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos excluir."),
  });

  const wa = whatsappLink(atleta.whatsapp);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80">
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl">{atleta.nome}</h2>
            <p className="mt-1 text-sm text-muted-fg">{atleta.email}</p>
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
            ["Clube", atleta.clube ?? "sem clube"],
            ["Unidade", atleta.unidade ?? "—"],
            ["Pedido", atleta.status_autorizacao ?? "—"],
            ["Filiação", atleta.filiacao],
            ["Cadastro", dataBr(atleta.created_at)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 space-y-4">
          <p className="eyebrow">Dados do atleta</p>
          <Field label="Nome completo">
            <TextInput value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <TextInput
              value={f.whatsapp}
              onChange={(e) => setF({ ...f, whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Faixa">
            <SelectInput value={f.faixa} onChange={(e) => setF({ ...f, faixa: e.target.value })}>
              <option value="">Sem faixa</option>
              {FAIXAS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Data de nascimento">
            <TextInput
              type="date"
              value={f.data_nascimento}
              onChange={(e) => setF({ ...f, data_nascimento: e.target.value })}
            />
          </Field>
          <Check
            checked={f.aceite_marketing_eventos}
            onChange={(v) => setF({ ...f, aceite_marketing_eventos: v })}
          >
            Aceita receber avisos de eventos e transmissões.
          </Check>
          <Btn full variant="outline" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando" : "Salvar dados"}
          </Btn>
        </div>

        {atleta.clube_id && (
          <div className="mt-8 space-y-3 border-t border-line pt-6">
            <Field
              label="Unidade no clube atual"
              hint="Para mudar de clube, use a aba Filiações."
            >
              <SelectInput value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="">Selecione a unidade</option>
                {(unidades ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                    {u.is_sede ? " (sede)" : ""}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Btn
              full
              variant="outline"
              disabled={!unidade || unidade === atleta.unidade_id || mudarUnidade.isPending}
              onClick={() => mudarUnidade.mutate()}
            >
              Mover para esta unidade
            </Btn>
          </div>
        )}

        <div className="mt-8 space-y-3 border-t border-line pt-6">
          <p className="eyebrow">Filiação</p>
          <Field label="Motivo (opcional)" hint="Ex.: cortesia do piloto.">
            <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {(["ativa", "pausada", "cancelada"] as const).map((s) => (
              <Btn
                key={s}
                variant={atleta.filiacao === s ? "primary" : "outline"}
                disabled={mudarFiliacao.isPending}
                onClick={() => mudarFiliacao.mutate(s)}
              >
                {s === "ativa" ? "Ativar" : s === "pausada" ? "Pausar" : "Cancelar"}
              </Btn>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-3 border-t border-line pt-6">
          <p className="eyebrow">Excluir cadastro</p>
          <p className="text-sm text-muted-fg">
            Apaga a conta, os vínculos e a filiação deste atleta. Não tem volta. Para confirmar,
            escreva <span className="text-foreground">EXCLUIR</span> abaixo.
          </p>
          <TextInput
            value={confirmar}
            placeholder="EXCLUIR"
            onChange={(e) => setConfirmar(e.target.value)}
          />
          <Btn
            full
            disabled={confirmar.trim().toUpperCase() !== "EXCLUIR" || excluir.isPending}
            onClick={() => excluir.mutate()}
          >
            {excluir.isPending ? "Excluindo" : "Excluir definitivamente"}
          </Btn>
        </div>
      </aside>
    </div>
  );
}
