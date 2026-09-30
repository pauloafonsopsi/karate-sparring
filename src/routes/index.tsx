import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { criarLead, getAppConfig, getPublicSenseis, type PublicSensei } from "@/lib/app.functions";
import { criarContaAtleta } from "@/lib/atleta.functions";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karate Legends Sparring · World League" },
      {
        name: "description",
        content:
          "Faça sua pré-inscrição na World League: treino semanal de sparring no dojô da sua região, presença e ranking.",
      },
      { property: "og:title", content: "Karate Legends Sparring · World League" },
      {
        property: "og:description",
        content:
          "Treino semanal de sparring no dojô da sua região, com presença e ranking nacional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://karate-sparring.lovable.app/og.jpg" },
      { name: "twitter:image", content: "https://karate-sparring.lovable.app/og.jpg" },
    ],
  }),
  component: Triagem,
});

type Sensei = PublicSensei;

type Dados = { nome: string; whatsapp: string; email: string; cidade: string; uf: string };

function Progresso({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
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
  const navigate = useNavigate();
  const configFn = useServerFn(getAppConfig);
  const publicSenseisFn = useServerFn(getPublicSenseis);
  const criarLeadFn = useServerFn(criarLead);
  const criarContaFn = useServerFn(criarContaAtleta);
  const abertoEm = useRef(Date.now());

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => configFn({}),
  });

  const { data: senseis, isLoading } = useQuery({
    queryKey: ["senseis-ativos"],
    queryFn: () => publicSenseisFn({}),
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
  const [conta, setConta] = useState({
    email_confirmacao: "",
    data_nascimento: "",
    senha: "",
    isca: "",
  });
  const [aceites, setAceites] = useState({ termos: false, lgpd: false, ranking: false });
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

  async function criarConta() {
    if (!sensei) return;
    const problema =
      dados.nome.trim().length < 3
        ? "Informe seu nome completo."
        : dados.whatsapp.replace(/\D/g, "").length < 10
          ? "Informe um WhatsApp válido."
          : !isEmail(dados.email)
            ? "Informe um email válido."
            : dados.email.trim().toLowerCase() !== conta.email_confirmacao.trim().toLowerCase()
              ? "Os dois emails precisam ser iguais."
              : !/^\d{4}-\d{2}-\d{2}$/.test(conta.data_nascimento)
                ? "Informe sua data de nascimento."
                : conta.senha.length < 8
                  ? "A senha precisa ter ao menos 8 caracteres."
                  : !aceites.termos || !aceites.lgpd || !aceites.ranking
                    ? "É necessário aceitar os três itens para criar a conta."
                    : null;
    if (problema) {
      toast.error(problema);
      return;
    }

    setEnviando(true);
    try {
      const email = dados.email.trim().toLowerCase();
      await criarContaFn({
        data: {
          nome: dados.nome.trim(),
          whatsapp: dados.whatsapp,
          email,
          email_confirmacao: conta.email_confirmacao.trim().toLowerCase(),
          data_nascimento: conta.data_nascimento,
          senha: conta.senha,
          sensei_id: sensei.id,
          aceite_termos: true as const,
          aceite_lgpd: true as const,
          aceite_ranking: true as const,
          isca: conta.isca,
          duracao_ms: Date.now() - abertoEm.current,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: conta.senha,
      });
      if (error) {
        void navigate({ to: "/auth" });
        return;
      }
      void navigate({ to: "/atleta" });
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Não conseguimos criar sua conta. Tente novamente em instantes.",
      );
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
      setPronto("Você será o primeiro a saber quando a World League chegar ao seu estado.");
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
            Treino semanal de sparring no dojô da sua região, com presença e ranking nacional.
          </p>
          <div className="mt-6 flex flex-wrap gap-5">
            <Link to="/sensei" className="eyebrow hover:text-foreground">
              Sou sensei →
            </Link>
            <Link to="/auth" className="eyebrow hover:text-foreground">
              Já tenho conta →
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <Progresso step={pronto ? 3 : espera ? 3 : step} />
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
                      setStep(3);
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
            <Passo n="03" titulo="Crie sua conta">
              <p className="mb-6 text-sm text-muted-fg">
                Sua conta fica vinculada ao dojô escolhido. A filiação é liberada pela liga.
              </p>
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
                    autoComplete="email"
                    onChange={(e) => setDados({ ...dados, email: e.target.value })}
                  />
                </Field>
                <Field label="Confirme o email" hint="Digite de novo, sem copiar e colar.">
                  <TextInput
                    value={conta.email_confirmacao}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    onChange={(e) => setConta({ ...conta, email_confirmacao: e.target.value })}
                  />
                </Field>
                <Field label="Data de nascimento">
                  <TextInput
                    value={conta.data_nascimento}
                    type="date"
                    onChange={(e) => setConta({ ...conta, data_nascimento: e.target.value })}
                  />
                </Field>
                <Field label="Senha" hint="Mínimo de 8 caracteres.">
                  <TextInput
                    value={conta.senha}
                    type="password"
                    autoComplete="new-password"
                    onChange={(e) => setConta({ ...conta, senha: e.target.value })}
                  />
                </Field>

                <input
                  type="text"
                  name="empresa"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={conta.isca}
                  onChange={(e) => setConta({ ...conta, isca: e.target.value })}
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    width: 1,
                    height: 1,
                    opacity: 0,
                  }}
                />

                <Check
                  checked={aceites.termos}
                  onChange={(v) => setAceites({ ...aceites, termos: v })}
                >
                  Aceito os termos de participação da World League.
                </Check>
                <Check checked={aceites.lgpd} onChange={(v) => setAceites({ ...aceites, lgpd: v })}>
                  Autorizo o contato e o uso dos meus dados conforme a Política de Privacidade.
                </Check>
                <Check
                  checked={aceites.ranking}
                  onChange={(v) => setAceites({ ...aceites, ranking: v })}
                >
                  Autorizo a exibição do meu nome e dojô no ranking da liga.
                </Check>

                <Btn full disabled={enviando} onClick={() => void criarConta()}>
                  {enviando ? "Criando conta" : "Criar minha conta"}
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
        ) : null}
      </div>
    </main>
  );
}
