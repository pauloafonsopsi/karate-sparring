import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { atualizarUnidadeAdmin, excluirUnidadeAdmin } from "@/lib/admin.functions";
import { DIAS_SEMANA, FUSOS, nomeDia } from "@/lib/semana";
import type { UnidadeAdmin } from "@/lib/unidades.functions";

export function EditorUnidade({
  unidade,
  onMudou,
}: {
  unidade: UnidadeAdmin;
  onMudou: () => void;
}) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(atualizarUnidadeAdmin);
  const excluirFn = useServerFn(excluirUnidadeAdmin);
  const [aberto, setAberto] = useState(false);

  const [f, setF] = useState({
    nome: unidade.nome,
    endereco: unidade.endereco ?? "",
    fuso_horario: unidade.fuso_horario,
    dia_aula: unidade.dia_aula ? String(unidade.dia_aula) : "",
    horario_aula: (unidade.horario_aula ?? "").slice(0, 5),
    duracao_minutos: String(unidade.duracao_minutos),
    raio_metros: String(unidade.raio_metros),
    ativa: unidade.ativa,
  });

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: ["unidades-admin", unidade.clube_id] });
    onMudou();
  };

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          unidade_id: unidade.id,
          nome: f.nome.trim(),
          endereco: f.endereco.trim() || null,
          fuso_horario: f.fuso_horario as (typeof FUSOS)[number],
          dia_aula: f.dia_aula ? Number(f.dia_aula) : null,
          horario_aula: f.horario_aula || null,
          duracao_minutos: Number(f.duracao_minutos),
          raio_metros: Number(f.raio_metros),
          ativa: f.ativa,
        },
      }),
    onSuccess: () => {
      toast.success("Unidade salva.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar a unidade."),
  });

  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { unidade_id: unidade.id } }),
    onSuccess: () => {
      toast.success("Unidade excluída.");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos excluir a unidade."),
  });

  return (
    <div className="border border-line">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left text-sm"
      >
        <span>
          {unidade.nome}
          {unidade.is_sede ? " (sede)" : ""}
          <span className="block text-xs text-muted-fg">
            {unidade.dia_aula ? nomeDia(unidade.dia_aula) : "dia não definido"} · raio{" "}
            {unidade.raio_metros} m · {unidade.ativa ? "ativa" : "inativa"}
          </span>
        </span>
        <span className="eyebrow">{aberto ? "fechar" : "editar"}</span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-line p-4">
          <Field label="Nome da unidade">
            <TextInput value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </Field>
          <Field label="Endereço">
            <TextInput
              value={f.endereco}
              onChange={(e) => setF({ ...f, endereco: e.target.value })}
            />
          </Field>
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
          <Field label="Dia da aula">
            <SelectInput
              value={f.dia_aula}
              onChange={(e) => setF({ ...f, dia_aula: e.target.value })}
            >
              <option value="">Não definido</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.nome}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Horário da aula">
            <TextInput
              type="time"
              value={f.horario_aula}
              onChange={(e) => setF({ ...f, horario_aula: e.target.value })}
            />
          </Field>
          <Field label="Duração (minutos)">
            <TextInput
              inputMode="numeric"
              value={f.duracao_minutos}
              onChange={(e) => setF({ ...f, duracao_minutos: e.target.value })}
            />
          </Field>
          <Field label="Raio do check-in (metros)" hint="De 50 a 2000.">
            <TextInput
              inputMode="numeric"
              value={f.raio_metros}
              onChange={(e) => setF({ ...f, raio_metros: e.target.value })}
            />
          </Field>
          <Check checked={f.ativa} onChange={(v) => setF({ ...f, ativa: v })}>
            Unidade aberta para novos atletas.
          </Check>
          <Btn full variant="outline" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando" : "Salvar unidade"}
          </Btn>
          {!unidade.is_sede && (
            <Btn
              full
              variant="ghost"
              disabled={excluir.isPending}
              onClick={() => excluir.mutate()}
            >
              Excluir unidade
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
