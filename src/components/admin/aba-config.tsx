import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Btn, Field, TextInput } from "@/components/kit";
import {
  getConfigAdmin,
  salvarConfigAdmin,
  type ChaveParametro,
  type ChaveTexto,
} from "@/lib/admin.functions";

const DINHEIRO: { chave: ChaveParametro; label: string; hint: string }[] = [
  {
    chave: "filiacao_liga_centavos",
    label: "Filiação à liga (por atleta/mês)",
    hint: "Valor que fica com a liga dentro da mensalidade do atleta.",
  },
  {
    chave: "mensalidade_minima_centavos",
    label: "Mensalidade mínima do clube",
    hint: "Nenhum clube pode cobrar menos que isso.",
  },
  {
    chave: "mensalidade_sugerida_centavos",
    label: "Mensalidade sugerida ao clube",
    hint: "Aparece como sugestão quando o sensei define o preço.",
  },
  {
    chave: "anuidade_centavos",
    label: "Anuidade do clube (sede) · à vista",
    hint: "Aparece na página de aplicação de senseis.",
  },
  {
    chave: "anuidade_mensal_centavos",
    label: "Anuidade do clube (sede) · por mês",
    hint: "Opção mensal mostrada ao sensei.",
  },
  {
    chave: "anuidade_unidade_extra_centavos",
    label: "Unidade extra · à vista",
    hint: "Valor por unidade além da sede.",
  },
  {
    chave: "anuidade_unidade_extra_mensal_centavos",
    label: "Unidade extra · por mês",
    hint: "Opção mensal por unidade além da sede.",
  },
];

const PRAZOS: { chave: ChaveParametro; label: string; hint: string }[] = [
  {
    chave: "carencia_troca_dias",
    label: "Carência para trocar de clube (dias)",
    hint: "0 libera a troca a qualquer momento.",
  },
  {
    chave: "bloqueio_recusa_dias",
    label: "Espera após recusa do clube (dias)",
    hint: "Tempo até o atleta poder pedir de novo ao mesmo clube.",
  },
  { chave: "pontos_presenca", label: "Ranking: pontos por Treinou", hint: "Treino semanal concluído." },
  { chave: "pontos_assistiu", label: "Ranking: pontos por Assistiu", hint: "Presente sem treinar ou sem completar; mantém a constância." },
  { chave: "pontos_sequencia", label: "Ranking: bônus de constância", hint: "Somado ao completar o ciclo sem falta." },
  { chave: "semanas_constancia", label: "Ranking: semanas por ciclo de constância", hint: "Quantidade de semanas seguidas necessária para o bônus." },
  { chave: "pontos_curso", label: "Ranking: pontos por curso concluído", hint: "Trilha inteira assistida." },
  { chave: "vagas_camp", label: "Ranking: zona de convocação (top N)", hint: "Linha de corte mostrada na página de ranking." },
];

function paraReais(centavos: number) {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function paraCentavos(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function AbaConfig() {
  const qc = useQueryClient();
  const salvarFn = useServerFn(salvarConfigAdmin);

  const { data: cfg } = useQuery({ queryKey: ["admin-config"], queryFn: () => getConfigAdmin() });

  const [valores, setValores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [textos, setTextos] = useState<Record<ChaveTexto, string>>({
    camp_titulo: "",
    camp_data_local: "",
    camp_texto: "",
    camp_link: "",
  });

  useEffect(() => {
    if (!cfg) return;
    const inicial: Record<string, string> = {};
    for (const { chave } of DINHEIRO) inicial[chave] = paraReais(cfg.numeros[chave]);
    for (const { chave } of PRAZOS) inicial[chave] = String(cfg.numeros[chave]);
    setValores(inicial);
    setAviso(cfg.aviso_global);
    setTextos(cfg.textos);
  }, [cfg]);

  const salvar = useMutation({
    mutationFn: (payload: {
      modo_piloto?: boolean;
      inscricoes_abertas?: boolean;
      camp_ativo?: boolean;
      publico_destaque?: "sensei" | "atleta";
      aviso_global?: string;
      numeros?: Record<string, number>;
      textos?: Partial<Record<ChaveTexto, string>>;
    }) => salvarFn({ data: payload }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-config"] });
      await qc.invalidateQueries({ queryKey: ["config"] });
      await qc.invalidateQueries({ queryKey: ["app-config"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos salvar."),
  });

  function salvarNumeros() {
    const numeros: Record<string, number> = {};
    for (const { chave, label } of DINHEIRO) {
      const n = paraCentavos(valores[chave] ?? "");
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`Valor inválido em "${label}".`);
        return;
      }
      numeros[chave] = n;
    }
    for (const { chave, label } of PRAZOS) {
      const n = Number(valores[chave]);
      if (!Number.isInteger(n) || n < 0) {
        toast.error(`Valor inválido em "${label}".`);
        return;
      }
      numeros[chave] = n;
    }
    salvar.mutate({ numeros });
  }

  const chave = (rotulo: string, ativo: boolean, onToggle: () => void) => (
    <div className="flex items-center justify-between border border-line bg-surface p-4">
      <span className="text-sm">{rotulo}</span>
      <button
        aria-label={rotulo}
        onClick={onToggle}
        className={`h-7 w-12 border ${ativo ? "border-brand bg-brand" : "border-line"}`}
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-10">
      <section className="space-y-4">
        <h2 className="eyebrow">Chaves da liga</h2>
        {chave("Modo piloto", cfg?.modo_piloto ?? false, () =>
          salvar.mutate({ modo_piloto: !(cfg?.modo_piloto ?? false) }),
        )}
        {chave("Inscrições de atletas abertas", cfg?.inscricoes_abertas ?? false, () =>
          salvar.mutate({ inscricoes_abertas: !(cfg?.inscricoes_abertas ?? false) }),
        )}
        <div className="border border-line bg-surface p-4">
          <p className="text-sm">Público em destaque na página inicial</p>
          <p className="mt-1 text-xs text-muted-fg">Define o botão dourado e a chamada principal.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["sensei", "atleta"] as const).map((p) => (
              <button
                key={p}
                aria-pressed={(cfg?.publico_destaque ?? "sensei") === p}
                onClick={() => salvar.mutate({ publico_destaque: p })}
                className={`min-h-11 border text-sm ${(cfg?.publico_destaque ?? "sensei") === p ? "border-brand" : "border-line"}`}
              >
                {p === "sensei" ? "Senseis" : "Atletas"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Valores (em reais)</h2>
        {DINHEIRO.map((p) => (
          <Field key={p.chave} label={p.label} hint={p.hint}>
            <TextInput
              inputMode="decimal"
              value={valores[p.chave] ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, [p.chave]: e.target.value }))}
            />
          </Field>
        ))}
        <h2 className="eyebrow pt-4">Prazos</h2>
        {PRAZOS.map((p) => (
          <Field key={p.chave} label={p.label} hint={p.hint}>
            <TextInput
              inputMode="numeric"
              value={valores[p.chave] ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, [p.chave]: e.target.value }))}
            />
          </Field>
        ))}
        <Btn full disabled={salvar.isPending} onClick={salvarNumeros}>
          {salvar.isPending ? "Salvando" : "Salvar valores e prazos"}
        </Btn>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Legends Camp na página inicial</h2>
        {chave("Mostrar chamada do Camp", cfg?.camp_ativo ?? false, () =>
          salvar.mutate({ camp_ativo: !(cfg?.camp_ativo ?? false) }),
        )}
        <Field label="Título">
          <TextInput
            value={textos.camp_titulo}
            maxLength={60}
            onChange={(e) => setTextos((t) => ({ ...t, camp_titulo: e.target.value }))}
          />
        </Field>
        <Field label="Data e local" hint="Ex.: Julho 2027 · Santarém/PA. Em branco não aparece.">
          <TextInput
            value={textos.camp_data_local}
            maxLength={80}
            onChange={(e) => setTextos((t) => ({ ...t, camp_data_local: e.target.value }))}
          />
        </Field>
        <Field label="Texto da chamada">
          <TextInput
            value={textos.camp_texto}
            maxLength={400}
            onChange={(e) => setTextos((t) => ({ ...t, camp_texto: e.target.value }))}
          />
        </Field>
        <Field label="Link (opcional)" hint="Endereço completo começando com https://">
          <TextInput
            value={textos.camp_link}
            maxLength={300}
            onChange={(e) => setTextos((t) => ({ ...t, camp_link: e.target.value }))}
          />
        </Field>
        <Btn
          full
          variant="outline"
          disabled={salvar.isPending}
          onClick={() =>
            salvar.mutate({
              textos: {
                camp_titulo: textos.camp_titulo.trim(),
                camp_data_local: textos.camp_data_local.trim(),
                camp_texto: textos.camp_texto.trim(),
                camp_link: textos.camp_link.trim(),
              },
            })
          }
        >
          Salvar Camp
        </Btn>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Aviso dentro do app</h2>
        <Field
          label="Texto do aviso"
          hint="Deixe em branco para não exibir nada. Aparece no topo para atletas e senseis."
        >
          <TextInput
            value={aviso}
            maxLength={280}
            placeholder="Ex.: a rodada desta semana começa na terça."
            onChange={(e) => setAviso(e.target.value)}
          />
        </Field>
        <Btn
          full
          variant="outline"
          disabled={salvar.isPending}
          onClick={() => salvar.mutate({ aviso_global: aviso.trim() })}
        >
          Salvar aviso
        </Btn>
      </section>
    </div>
  );
}
