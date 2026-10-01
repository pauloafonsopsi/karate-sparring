import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { OG_IMAGE } from "@/lib/config";
import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { criarLead, getAppConfig } from "@/lib/app.functions";
import { listarClubesPublicos, type ClubeDaVitrine } from "@/lib/clube.functions";
import { brl } from "@/lib/preco";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karate Legends Sparring · World League" },
      {
        name: "description",
        content:
          "Treine sparring toda semana no clube licenciado da sua região, suba no ranking e dispute a vaga no Legends Camp.",
      },
      { property: "og:title", content: "Karate Legends Sparring · World League" },
      {
        property: "og:description",
        content:
          "Clubes licenciados, treino semanal de sparring, ranking e vaga no Legends Camp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: Vitrine,
});

type Dados = { nome: string; whatsapp: string; email: string; cidade: string; uf: string };

function Vitrine() {
  const navigate = useNavigate();
  const configFn = useServerFn(getAppConfig);
  const clubesFn = useServerFn(listarClubesPublicos);
  const criarLeadFn = useServerFn(criarLead);

  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => configFn({}) });
  const { data: clubes, isLoading } = useQuery({
    queryKey: ["clubes-publicos"],
    queryFn: () => clubesFn({}),
  });

  const [uf, setUf] = useState("");
  const [espera, setEspera] = useState(false);
  const [pronto, setPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [dados, setDados] = useState<Dados>({
    nome: "",
    whatsapp: "",
    email: "",
    cidade: "",
    uf: "",
  });

  const inscricoesAbertas = config?.inscricoes_abertas !== false;
  const lista = clubes ?? [];
  const ufsDisponiveis = [...new Set(lista.map((c) => c.uf))].sort();
  const semClubes = !isLoading && ufsDisponiveis.length === 0;
  const filtrados = uf ? lista.filter((c) => c.uf === uf) : lista;

  async function enviarEspera() {
    const erro =
      dados.nome.trim().length < 3
        ? "Informe seu nome completo."
        : dados.whatsapp.replace(/\D/g, "").length < 10
          ? "Informe um WhatsApp válido."
          : !isEmail(dados.email)
            ? "Informe um email válido."
            : !dados.uf
              ? "Selecione seu estado."
              : !aceite
                ? "É necessário autorizar o uso dos seus dados."
                : null;
    if (erro) {
      toast.error(erro);
      return;
    }
    setEnviando(true);
    try {
      await criarLeadFn({
        data: {
          nome: dados.nome.trim(),
          whatsapp: dados.whatsapp,
          email: dados.email.trim().toLowerCase(),
          cidade: dados.cidade.trim() || null,
          uf: dados.uf,
          sensei_id: null,
          aceite_lgpd: true as const,
        },
      });
      setPronto("Você será o primeiro a saber quando a World League chegar ao seu estado.");
    } catch {
      toast.error("Não conseguimos salvar seus dados. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="mb-10">
          <Wordmark size="lg" />
          <h1 className="mt-10 text-[11vw] leading-[0.88] sm:text-6xl">Sparring toda semana</h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-fg">
            Treine no clube licenciado da sua região, suba no ranking oficial e dispute a
            convocação para o Legends Camp.
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

        {pronto ? (
          <div className="cut-in border border-line bg-surface p-6">
            <h2 className="mb-3 text-xl">Tudo certo</h2>
            <p className="text-sm leading-relaxed text-muted-fg">{pronto}</p>
          </div>
        ) : espera || semClubes || !inscricoesAbertas ? (
          <section className="cut-in">
            <div className="mb-6 flex items-end gap-4">
              <span className="fight-number text-brand">01</span>
              <h2 className="pb-1 text-2xl">Lista de espera</h2>
            </div>
            <p className="mb-6 text-sm text-muted-fg">
              {inscricoesAbertas
                ? "Deixe seus dados e avisaremos assim que abrirmos um clube perto de você."
                : "As inscrições estão temporariamente fechadas. Deixe seus dados e avisaremos na reabertura."}
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
                  onChange={(e) => setDados({ ...dados, email: e.target.value })}
                />
              </Field>
              <Field label="Estado">
                <SelectInput
                  value={dados.uf}
                  onChange={(e) => setDados({ ...dados, uf: e.target.value })}
                >
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
                Autorizo o contato e o uso dos meus dados conforme a Política de Privacidade.
              </Check>
              <Btn full disabled={enviando} onClick={() => void enviarEspera()}>
                {enviando ? "Enviando" : "Entrar na lista de espera"}
              </Btn>
            </div>
            {!semClubes && inscricoesAbertas && (
              <Btn variant="ghost" className="mt-4 px-0" onClick={() => setEspera(false)}>
                Voltar
              </Btn>
            )}
          </section>
        ) : (
          <section className="cut-in">
            <div className="mb-6 flex items-end gap-4">
              <span className="fight-number text-brand">01</span>
              <h2 className="pb-1 text-2xl">Clubes licenciados</h2>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setUf("")}
                className={`eyebrow border px-3 py-2 ${uf === "" ? "border-brand text-foreground" : "border-line text-muted-fg"}`}
              >
                Todos
              </button>
              {ufsDisponiveis.map((u) => (
                <button
                  key={u}
                  onClick={() => setUf(u)}
                  className={`eyebrow border px-3 py-2 ${uf === u ? "border-brand text-foreground" : "border-line text-muted-fg"}`}
                >
                  {u}
                </button>
              ))}
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-fg">Carregando clubes…</p>
            ) : (
              <div className="space-y-3">
                {filtrados.map((c) => (
                  <CardClube
                    key={c.id}
                    clube={c}
                    onClick={() => void navigate({ to: "/c/$slug", params: { slug: c.slug } })}
                  />
                ))}
              </div>
            )}

            <Btn variant="ghost" className="mt-6 px-0" onClick={() => setEspera(true)}>
              Meu estado ainda não está aqui
            </Btn>
          </section>
        )}

        {config?.camp_ativo && config.textos.camp_titulo && (
          <section className="mt-16 border-2 border-foreground p-6">
            <p className="eyebrow">O topo do ranking</p>
            <h2 className="mt-3 text-4xl leading-[0.9]">{config.textos.camp_titulo}</h2>
            {config.textos.camp_data_local && (
              <p className="display mt-3 text-sm">{config.textos.camp_data_local}</p>
            )}
            {config.textos.camp_texto && (
              <p className="mt-4 text-sm leading-relaxed text-muted-fg">
                {config.textos.camp_texto}
              </p>
            )}
            {config.textos.camp_link && (
              <a
                href={config.textos.camp_link}
                target="_blank"
                rel="noreferrer"
                className="eyebrow mt-5 inline-block text-foreground underline"
              >
                Saiba mais →
              </a>
            )}
          </section>
        )}

        <section className="mt-16 border-t border-line pt-8">
          <h2 className="mb-5 text-2xl">Como funciona</h2>
          <ol className="space-y-4">
            {[
              "Escolha o clube licenciado da sua região.",
              "Cadastre-se pelo link do clube e aguarde a autorização do sensei.",
              "Treine sparring toda semana e marque presença.",
              "Suba no ranking e dispute a convocação para o Legends Camp.",
            ].map((p, i) => (
              <li key={p} className="flex gap-4">
                <span className="display w-6 shrink-0 text-lg">{i + 1}</span>
                <span className="text-sm leading-relaxed text-muted-fg">{p}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

function CardClube({ clube, onClick }: { clube: ClubeDaVitrine; onClick: () => void }) {
  const total =
    clube.mensalidade_centavos != null
      ? clube.mensalidade_centavos + clube.filiacao_liga_centavos
      : null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 border border-line bg-surface p-4 text-left hover:border-brand"
    >
      {clube.foto_url ? (
        <img
          src={clube.foto_url}
          alt={clube.responsavel}
          loading="lazy"
          className="h-16 w-16 shrink-0 object-cover grayscale"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-background">
          <div className="h-8 w-8 rounded-full bg-line" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="display text-base">{clube.clube}</div>
        <div className="mt-1 text-xs text-brand">{clube.graduacao ?? clube.responsavel}</div>
        <div className="text-xs text-muted-fg">
          {clube.cidade}/{clube.uf}
        </div>
        <div className="mt-2 text-xs text-muted-fg">
          {clube.piloto
            ? `${brl(clube.mensalidade_centavos)}/mês no clube · filiação à liga em cortesia`
            : `${brl(total)}/mês · ${brl(clube.mensalidade_centavos)} clube + ${brl(clube.filiacao_liga_centavos)} liga`}
        </div>
      </div>
    </button>
  );
}
