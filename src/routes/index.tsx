import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { criarLead, getAppConfig, redirectCheckout } from "@/lib/app.functions";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/")({
  component: Triagem,
});

type Sensei = {
  id: string;
  nome: string;
  dojo: string;
  cidade: string;
  uf: string;
  graduacao: string | null;
  foto_url: string | null;
  piloto: boolean;
};

type Dados = { nome: string; whatsapp: string; email: string; cidade: string; uf: string };

function Progresso({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={`h-0.5 w-8 ${n <= step ? "bg-brand" : "bg-line"}`} />
      ))}
    </div>
  );
}

function Passo({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="cut-in">
      <div className="mb-6 flex items-end gap-4">
        <span className="fight-number text-brand">{n}</span>
        <h2 className="pb-1 text-2xl">{titulo}</h2>
      </div>
      {children}
    </div>
  );
}

function Triagem() {
  const configFn = useServerFn(getAppConfig);
  const checkoutFn = useServerFn(redirectCheckout);
  const criarLeadFn = useServerFn(criarLead);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => configFn({}),
  });

  const { data: senseis, isLoading } = useQuery({
    queryKey: ["senseis-ativos"],
    queryFn: async (): Promise<Sensei[]> => {
      const { data, error } = await supabase
        .from("senseis")
        .select("id, nome, dojo, cidade, uf, graduacao, foto_url, piloto")
        .eq("status", "ativo")
        .order("uf");
      if (error) throw error;
      return (data ?? []) as Sensei[];
    },
  });

  const [step, setStep] = useState(1);
  const [espera, setEspera] = useState(false);
  const [uf, setUf] = useState("");
  const [sensei, setSensei] = useState<Sensei | null>(null);
  const [dados, setDados] = useState<Dados>({
    nome: "",
    whatsapp: "",
    email: "",
    cidade: "",
    uf: "",
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);

  const inscricoesAbertas = config?.inscricoes_abertas !== false;
  const modoPiloto = config?.modo_piloto !== false;

  const elegiveis = (senseis ?? []).filter((s) => (modoPiloto ? s.piloto : true));
  const ufsDisponiveis = [...new Set(elegiveis.map((s) => s.uf))].sort();
  const semSenseis = !isLoading && ufsDisponiveis.length === 0;

  function validarDados(comUf: boolean) {
    if (dados.nome.trim().length < 3) return "Informe seu nome completo.";
    if (dados.whatsapp.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido.";
    if (!isEmail(dados.email)) return "Informe um email válido.";
    if (comUf && !dados.uf) return "Selecione seu estado.";
    if (!aceite) return "É necessário autorizar o uso dos seus dados.";
    return null;
  }

  async function salvarLead(senseiId: string | null) {
    const { id } = await criarLeadFn({
      data: {
        nome: dados.nome.trim(),
        whatsapp: dados.whatsapp,
        email: dados.email.trim().toLowerCase(),
        cidade: dados.cidade.trim() || null,
        uf: senseiId ? uf : dados.uf,
        sensei_id: senseiId,
        aceite_lgpd: true as const,
      },
    });
    return id;
  }

  async function continuarCadastro() {
    const erro = validarDados(false);
    if (erro) {
      toast.error(erro);
      return;
    }
    setEnviando(true);
    try {
      const id = leadId ?? (await salvarLead(sensei?.id ?? null));
      setLeadId(id);
      setStep(4);
    } catch {
      toast.error("Não conseguimos salvar seus dados. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function escolherProduto(produto: "mensal" | "avulso") {
    if (!leadId) return;
    setEnviando(true);
    try {
      const { url } = await checkoutFn({ data: { lead_id: leadId, produto } });
      if (!url) {
        setPronto(
          "Inscrições para este dojô abrem em breve. Seu cadastro foi salvo e avisaremos você no WhatsApp.",
        );
        return;
      }
      window.location.href = url;
    } catch {
      toast.error("Falha ao abrir o pagamento. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarEspera() {
    const erro = validarDados(true);
    if (erro) {
      toast.error(erro);
      return;
    }
    setEnviando(true);
    try {
      await salvarLead(null);
      setPronto("Você será o primeiro a saber quando o Karate Sparring chegar ao seu estado.");
    } catch {
      toast.error("Não conseguimos salvar seus dados. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const formularioEspera = (
    <div className="space-y-4">
      <Field label="Nome completo">
        <TextInput
          value={dados.nome}
          onChange={(e) => setDados({ ...dados, nome: e.target.value })}
          autoComplete="name"
        />
      </Field>
      <Field label="WhatsApp">
        <TextInput
          value={dados.whatsapp}
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          onChange={(e) => setDados({ ...dados, whatsapp: maskWhatsapp(e.target.value) })}
        />
      </Field>
      <Field label="Email">
        <TextInput
          value={dados.email}
          type="email"
          inputMode="email"
          onChange={(e) => setDados({ ...dados, email: e.target.value })}
        />
      </Field>
      <Field label="Estado">
        <SelectInput value={dados.uf} onChange={(e) => setDados({ ...dados, uf: e.target.value })}>
          <option value="">Selecione</option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Cidade">
        <TextInput
          value={dados.cidade}
          onChange={(e) => setDados({ ...dados, cidade: e.target.value })}
        />
      </Field>
      <Check checked={aceite} onChange={setAceite}>
        Autorizo o contato e o uso dos meus dados conforme a{" "}
        <a href="#" className="text-foreground underline">
          Política de Privacidade
        </a>
        .
      </Check>
      <Btn full disabled={enviando} onClick={enviarEspera}>
        {enviando ? "Enviando" : "Entrar na lista de espera"}
      </Btn>
    </div>
  );

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="mb-10">
          <Wordmark size="lg" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-fg">
            Treinos de sparring todos os sábados, no seu estado, com sensei licenciado.
          </p>
          <div className="mt-6">
            <Link to="/sensei" className="eyebrow hover:text-foreground">
              Sou sensei →
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <Progresso step={pronto ? 4 : espera ? 3 : step} />
        </div>

        {pronto ? (
          <div className="cut-in border border-line bg-surface p-6">
            <h2 className="mb-3 text-xl">Tudo certo</h2>
            <p className="text-sm leading-relaxed text-muted-fg">{pronto}</p>
          </div>
        ) : espera || semSenseis ? (
          <Passo n="01" titulo="Lista de espera">
            <p className="mb-6 text-sm text-muted-fg">
              Deixe seus dados e avisaremos assim que abrirmos um dojô perto de você.
            </p>
            {formularioEspera}
            {!semSenseis && (
              <Btn variant="ghost" className="mt-4 px-0" onClick={() => setEspera(false)}>
                Voltar
              </Btn>
            )}
          </Passo>
        ) : step === 1 ? (
          <Passo n="01" titulo="Onde você vai treinar?">
            {isLoading ? (
              <p className="text-sm text-muted-fg">Carregando estados…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ufsDisponiveis.map((u) => (
                  <button
                    key={u}
                    onClick={() => {
                      setUf(u);
                      setStep(2);
                    }}
                    className="display min-h-16 border border-line bg-surface text-xl hover:border-brand"
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            <Btn variant="ghost" className="mt-6 px-0" onClick={() => setEspera(true)}>
              Meu estado ainda não está aqui
            </Btn>
          </Passo>
        ) : step === 2 ? (
          <Passo n="02" titulo="Escolha seu dojô">
            <div className="space-y-3">
              {elegiveis
                .filter((s) => s.uf === uf)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSensei(s);
                      setStep(inscricoesAbertas ? 3 : 3);
                    }}
                    className="flex w-full items-center gap-4 border border-line bg-surface p-4 text-left hover:border-brand"
                  >
                    {s.foto_url ? (
                      <img
                        src={s.foto_url}
                        alt={s.nome}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 object-cover grayscale"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-background">
                        <div className="h-8 w-8 rounded-full bg-line" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="display text-base">{s.nome}</div>
                      <div className="mt-1 text-xs text-brand">{s.graduacao ?? "—"}</div>
                      <div className="text-xs text-muted-fg">
                        {s.dojo} · {s.cidade}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <Btn variant="ghost" className="mt-6 px-0" onClick={() => setStep(1)}>
              Voltar
            </Btn>
          </Passo>
        ) : step === 3 ? (
          inscricoesAbertas ? (
            <Passo n="03" titulo="Seus dados">
              <div className="space-y-4">
                <Field label="Nome completo">
                  <TextInput
                    value={dados.nome}
                    autoComplete="name"
                    onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  />
                </Field>
                <Field label="WhatsApp">
                  <TextInput
                    value={dados.whatsapp}
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                    onChange={(e) => setDados({ ...dados, whatsapp: maskWhatsapp(e.target.value) })}
                  />
                </Field>
                <Field label="Email">
                  <TextInput
                    value={dados.email}
                    type="email"
                    inputMode="email"
                    onChange={(e) => setDados({ ...dados, email: e.target.value })}
                  />
                </Field>
                <Field label="Cidade (opcional)">
                  <TextInput
                    value={dados.cidade}
                    onChange={(e) => setDados({ ...dados, cidade: e.target.value })}
                  />
                </Field>
                <Check checked={aceite} onChange={setAceite}>
                  Autorizo o contato e o uso dos meus dados conforme a{" "}
                  <a href="#" className="text-foreground underline">
                    Política de Privacidade
                  </a>
                  .
                </Check>
                <Btn full disabled={enviando} onClick={continuarCadastro}>
                  {enviando ? "Salvando" : "Continuar"}
                </Btn>
              </div>
              <Btn variant="ghost" className="mt-4 px-0" onClick={() => setStep(2)}>
                Voltar
              </Btn>
            </Passo>
          ) : (
            <Passo n="03" titulo="Lista de espera">
              <p className="mb-6 text-sm text-muted-fg">
                As inscrições estão temporariamente fechadas. Deixe seus dados e avisaremos na
                reabertura.
              </p>
              {formularioEspera}
            </Passo>
          )
        ) : (
          <Passo n="04" titulo="Como você quer treinar?">
            <div className="space-y-4">
              <div className="border-2 border-brand bg-surface p-6">
                <div className="eyebrow text-brand">Mensal</div>
                <div className="fight-number mt-2">R$ 100</div>
                <p className="mt-2 text-sm text-muted-fg">Todos os sábados do mês.</p>
                <Btn full className="mt-5" disabled={enviando} onClick={() => escolherProduto("mensal")}>
                  Quero treinar todo sábado
                </Btn>
              </div>
              <div className="border border-line bg-surface p-6">
                <div className="eyebrow">Avulso</div>
                <div className="fight-number mt-2">R$ 30</div>
                <p className="mt-2 text-sm text-muted-fg">Um sábado para experimentar.</p>
                <Btn
                  full
                  variant="outline"
                  className="mt-5"
                  disabled={enviando}
                  onClick={() => escolherProduto("avulso")}
                >
                  Quero experimentar
                </Btn>
              </div>
            </div>
          </Passo>
        )}
      </div>
    </main>
  );
}
