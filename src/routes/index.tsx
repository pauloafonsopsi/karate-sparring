import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import auraAsset from "@/assets/aura.webp.asset.json";
import campAsset from "@/assets/camp.webp.asset.json";
import chuteAsset from "@/assets/chute.webp";
import heroDesktopAsset from "@/assets/hero-desktop.webp.asset.json";
import heroMobileAsset from "@/assets/hero-mobile.webp.asset.json";
import rotinaAsset from "@/assets/rotina.webp.asset.json";
import { MarcaCompacta, Monograma } from "@/components/brand";
import { Top10 } from "@/components/top10";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";
import { criarLead, getAppConfig } from "@/lib/app.functions";
import { listarClubesPublicos, type ClubeDaVitrine } from "@/lib/clube.functions";
import { OG_IMAGE } from "@/lib/config";
import { brl } from "@/lib/preco";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karate Legends Sparring · Liga de sparring de karatê para adultos" },
      {
        name: "description",
        content:
          "Treine sparring toda semana num clube licenciado, sem sair do seu dojô. Suba no ranking e dispute a convocação para o Legends Camp.",
      },
      { property: "og:title", content: "Karate Legends Sparring · World League" },
      {
        property: "og:description",
        content: "Sparring semanal em clubes licenciados, ranking e o caminho até o Legends Camp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "preload", as: "image", href: heroDesktopAsset.url, media: "(min-width: 768px)" },
      { rel: "preload", as: "image", href: heroMobileAsset.url, media: "(max-width: 767px)" },
    ],
  }),
  component: Landing,
});

type Dados = { nome: string; whatsapp: string; email: string; cidade: string; uf: string };

const NAV = [
  { href: "#rotina", label: "A rotina" },
  { href: "#passaporte", label: "Passaporte" },
  { href: "#camp", label: "Legends Camp" },
  { href: "#clubes", label: "Clubes" },
  { href: "#faq", label: "Perguntas" },
];

function Landing() {
  const navigate = useNavigate();
  const configFn = useServerFn(getAppConfig);
  const clubesFn = useServerFn(listarClubesPublicos);
  const acessoFn = useServerFn(getMeuAcesso);

  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => configFn({}) });
  const { data: clubes, isLoading } = useQuery({
    queryKey: ["clubes-publicos"],
    queryFn: () => clubesFn({}),
  });

  // Usuário logado vai direto para a própria área.
  useEffect(() => {
    let ativo = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session || !ativo) return;
      try {
        const acesso = await acessoFn();
        if (ativo) void navigate({ to: acesso.area, replace: true });
      } catch {
        /* segue na landing */
      }
    });
    return () => {
      ativo = false;
    };
  }, [acessoFn, navigate]);

  const filiacao = clubes?.[0]?.filiacao_liga_centavos ?? 1990;

  return (
    <main className="min-h-screen bg-background">
      <Cabecalho />
      <Hero sensei={(config?.publico_destaque ?? "sensei") === "sensei"} />
      <Rotina />
      <Top10Secao />
      <Passaporte />
      <Camp config={config} />
      <Vitrine
        clubes={clubes ?? []}
        carregando={isLoading}
        inscricoesAbertas={config?.inscricoes_abertas !== false}
      />
      <Faq filiacao={filiacao} />
      <Rodape />
    </main>
  );
}

/* ---------------------------------------------------------------- Cabeçalho */

function Cabecalho() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-5 py-5 md:flex md:justify-between md:px-10">
        <Link to="/" aria-label="Karate Legends Sparring">
          <MarcaCompacta />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="eyebrow hover:text-foreground">
              {n.label}
            </a>
          ))}
          <Link to="/ranking" className="eyebrow hover:text-foreground">
            Ranking
          </Link>
          <Link to="/sensei" className="eyebrow hover:text-foreground">
            Para senseis
          </Link>
        </nav>
        <Link
          to="/auth"
          className="eyebrow shrink-0 border border-foreground/30 px-4 py-2.5 text-foreground hover:border-foreground"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- Hero */

const ouro =
  "inline-flex min-h-14 items-center justify-center bg-brand px-8 text-sm font-semibold tracking-[0.14em] text-background uppercase hover:bg-gold-soft";
const contorno =
  "inline-flex min-h-14 items-center justify-center border border-foreground/30 px-8 text-sm font-semibold tracking-[0.14em] text-foreground uppercase hover:border-foreground";

function Top10Secao() {
  return (
    <section id="top10" className="scroll-mt-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.2fr] md:px-10 md:py-32">
        <div>
          <p className="eyebrow">Quadro da temporada</p>
          <h2 className="mt-4 text-4xl leading-[0.9] md:text-6xl">Top 10</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-fg">
            Na liga, sobe quem está presente. A classificação completa fica na área do atleta.
          </p>
          <Link to="/ranking" className="eyebrow mt-8 inline-block border-b border-foreground/30 pb-1 text-foreground hover:border-foreground">
            Como pontua
          </Link>
        </div>
        <Top10 />
      </div>
    </section>
  );
}

function Hero({ sensei }: { sensei: boolean }) {
  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden md:items-center" style={{ backgroundImage: "radial-gradient(ellipse at 75% 25%, color-mix(in oklab, var(--marsala) 85%, transparent), var(--background) 70%)" }}>
      <picture className="absolute inset-0 -z-20">
        <source media="(min-width: 768px)" srcSet={heroDesktopAsset.url} />
        <img
          src={heroMobileAsset.url}
          alt="Dois atletas de karatê em sparring sob as luzes de uma arena"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[60%_20%] md:object-[70%_30%]"
        />
      </picture>
      {/* degradês: leitura à esquerda e fusão com o fundo embaixo; o alto à direita fica livre */}
      <div className="absolute inset-0 -z-10 hidden md:block" style={{ backgroundImage: "var(--fade-left)" }} />
      <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--fade-bottom)" }} />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 md:hidden"
        style={{ backgroundImage: "linear-gradient(to top, var(--background) 35%, transparent)" }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 pt-32 pb-14 md:px-10 md:pb-24">
        <div className="max-w-xl">
          <Monograma className="h-20 w-20 md:h-28 md:w-28" />
          <p className="eyebrow mt-6 text-gold-soft">Karate Legends · Liga de sparring de karatê</p>
          <h1 className="mt-4 text-[13vw] leading-[0.86] [text-shadow:0_2px_24px_var(--background)] md:text-7xl lg:text-8xl">
            {sensei ? (
              <>
<span className="block text-[8vw] md:text-5xl lg:text-6xl">Credenciamento de clubes e ligas · Temporada inaugural</span>
              </>
            ) : (
              <>
<span className="block text-[9vw] md:text-6xl lg:text-7xl">A liga de sparring do Karate Legends.</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/90">
            {sensei
              ? "A liga admite clubes de karatê que conduzem a turma semanal de sparring dentro do seu padrão."
              : "Clubes licenciados. Uma temporada. Um ranking. Um passaporte para cada atleta."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {sensei ? (
              <>
                <Link to="/sensei" className={ouro}>Solicitar credenciamento</Link>
                <a href="#clubes" className={contorno}>Encontrar um clube</a>
              </>
            ) : (
              <>
                <a href="#clubes" className={ouro}>Encontrar um clube</a>
                <Link to="/sensei" className={contorno}>Solicitar credenciamento</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Rotina */

function Rotina() {
  const passos = [
    ["01", "O clube", "O atleta escolhe um clube licenciado. Os valores aparecem antes da inscrição."],
    ["02", "A admissão", "O sensei confirma sua entrada e seu nível."],
    ["03", "A presença", "Uma turma de sparring por semana. Cada presença é registrada."],
    ["04", "O ranking", "A assiduidade define a posição na temporada."],
  ];
  return (
    <section id="rotina" className="relative scroll-mt-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.1fr] md:px-10 md:py-36">
        <div>
          <p className="eyebrow">A rotina</p>
          <h2 className="mt-4 text-4xl leading-[0.9] md:text-6xl">
            Você treina aqui.
            <br />
            <span className="text-muted-fg">Toda semana.</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-fg">
            Uma turma semanal de sparring. O atleta segue no seu dojô, com o seu sensei.
          </p>
          <div className="relative mt-10 aspect-[4/3] overflow-hidden">
            <img
              src={rotinaAsset.url}
              alt="Chute alto durante um sparring"
              loading="lazy"
              decoding="async"
              width={1000}
              height={667}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, var(--background), transparent 50%)" }} />
          </div>
        </div>
        <ol className="self-center">
          {passos.map(([n, t, d]) => (
            <li key={n} className="grid grid-cols-[auto_1fr] gap-6 border-b border-line py-7 first:border-t">
              <span className="fight-number text-foreground/25">{n}</span>
              <div className="pt-1">
                <h3 className="text-xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-fg">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Passaporte */

function Passaporte() {
  return (
    <section id="passaporte" className="relative isolate scroll-mt-10 overflow-hidden border-t border-line">
      <img
        src={auraAsset.url}
        alt=""
        aria-hidden
        loading="lazy"
              decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--fade-bottom)" }} />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-10 md:py-36">
        <div>
          <p className="eyebrow">A credencial do atleta</p>
          <h2 className="mt-4 text-4xl leading-[0.9] md:text-6xl">Passaporte do atleta</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-fg">
            Todo atleta da liga tem um. Ele registra o clube, a temporada, a posição e cada semana de presença.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Clube e temporada", "Posição no quadro da liga", "Semanas de presença"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-px w-6 bg-foreground/40" />
                {t}
              </li>
            ))}
          </ul>
          <Link to="/ranking" className="eyebrow mt-10 inline-block border-b border-foreground/30 pb-1 text-foreground hover:border-foreground">
            Como funciona o ranking
          </Link>
        </div>

        {/* Cartão ilustrativo */}
        <div className="relative mx-auto w-full max-w-sm">
          <div
            className="absolute -inset-6 -z-10 blur-2xl"
            style={{ backgroundImage: "radial-gradient(closest-side, color-mix(in oklab, var(--marsala) 90%, transparent), transparent)" }}
          />
          <div className="relative border border-foreground/15 bg-background/80 p-6 backdrop-blur-md">
            <div className="gold-rule absolute inset-x-0 top-0" />
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Passaporte · temporada</p>
                <p className="display mt-3 text-2xl">Seu nome</p>
                <p className="mt-1 text-xs text-muted-fg">Faixa marrom · Clube exemplo · PA</p>
              </div>
              <Monograma className="h-10 w-10 shrink-0" />
            </div>
            <div className="mt-8 grid grid-cols-2 gap-px bg-line">
              <div className="bg-background p-4">
                <p className="eyebrow">Posição</p>
                <p className="fight-number mt-2 gold-text">#07</p>
              </div>
              <div className="bg-background p-4">
                <p className="eyebrow">Sequência</p>
                <p className="fight-number mt-2">12<span className="ml-1 text-base text-muted-fg">sem.</span></p>
              </div>
            </div>
            <div className="mt-5 flex gap-1" aria-label="Últimas 12 semanas">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="h-6 flex-1 bg-foreground/80" />
              ))}
            </div>
            <p className="mt-4 text-[10px] tracking-[0.2em] text-muted-fg uppercase">
              Exemplo ilustrativo
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Camp */

type Config = Awaited<ReturnType<typeof getAppConfig>> | undefined;

function Camp({ config }: { config: Config }) {
  const titulo = (config?.camp_ativo && config.textos.camp_titulo) || "Legends Camp";
  const dataLocal = config?.camp_ativo ? config.textos.camp_data_local : "";
  const texto =
    (config?.camp_ativo && config.textos.camp_texto) ||
    "Ao fim de cada temporada, o Legends Camp reúne, em três dias de reality show, os atletas mais assíduos e os melhores de cada região.";
  const link = config?.camp_ativo ? config.textos.camp_link : "";

  return (
    <section id="camp" className="relative isolate scroll-mt-10 overflow-hidden">
      <img
        src={campAsset.url}
        alt="Arena do Legends Camp com público e luzes"
        loading="lazy"
              decoding="async"
        width={1400}
        height={933}
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
      />
      <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--fade-left)" }} />
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "linear-gradient(to top, var(--background), transparent 35%), linear-gradient(to bottom, var(--background), transparent 25%)" }}
      />
      <div className="absolute inset-0 -z-10 mix-blend-multiply" style={{ backgroundImage: "var(--glow-marsala)" }} />

      <div className="mx-auto flex min-h-[85svh] max-w-7xl items-center px-5 py-24 md:px-10">
        <div className="max-w-xl">
          <p className="eyebrow text-gold-soft">Fim de temporada</p>
          <h2 className="mt-4 text-5xl leading-[0.86] md:text-8xl">{titulo}</h2>
          {dataLocal && <p className="display mt-5 text-base text-foreground/90">{dataLocal}</p>}
          <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/80">{texto}</p>
          <p className="mt-6 text-xs text-muted-fg">
            A convocação é feita por curadoria da liga.
          </p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-13 items-center border border-foreground/40 px-6 text-sm font-semibold tracking-[0.14em] uppercase hover:border-foreground"
            >
              Ver o Camp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Vitrine */

function Vitrine({
  clubes: clubesProp,
  carregando,
  inscricoesAbertas,
}: {
  clubes?: ClubeDaVitrine[] | null;
  carregando: boolean;
  inscricoesAbertas: boolean;
}) {
  const navigate = useNavigate();
  const [uf, setUf] = useState("");
  const clubes = Array.isArray(clubesProp) ? clubesProp : [];
  const ufsDisponiveis = [...new Set(clubes.map((c) => c.uf))].sort();
  const filtrados = uf ? clubes.filter((c) => c.uf === uf) : clubes;
  const vazio = !carregando && filtrados.length === 0;

  return (
    <section id="clubes" className="scroll-mt-10 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Clubes licenciados</p>
            <h2 className="mt-4 text-4xl leading-[0.9] md:text-6xl">Encontrar um clube</h2>
          </div>
          <div className="w-full md:w-64">
            <Field label="Seu estado">
              <SelectInput value={uf} onChange={(e) => setUf(e.target.value)}>
                <option value="">Todos os estados</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                    {ufsDisponiveis.includes(u) ? " · com clube" : ""}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </div>

        {!inscricoesAbertas && (
          <p className="mt-8 border border-line p-4 text-sm text-muted-fg">
            As inscrições estão temporariamente fechadas. Deixe seus dados abaixo e avisaremos na
            reabertura.
          </p>
        )}

        {carregando ? (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse bg-surface" />
            ))}
          </div>
        ) : vazio || !inscricoesAbertas ? (
          <EstadoVazio uf={uf} />
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((c) => (
              <CardClube
                key={c.id}
                clube={c}
                onClick={() => void navigate({ to: "/c/$slug", params: { slug: c.slug } })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EstadoVazio({ uf }: { uf: string }) {
  return (
    <div className="mt-10 grid gap-px bg-line md:grid-cols-2">
      <div className="relative isolate overflow-hidden bg-background p-6 md:p-10">
        <div className="absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: "var(--glow-marsala)" }} />
        <p className="eyebrow">Para atletas</p>
        <h3 className="mt-3 text-3xl leading-[0.9]">
          A liga ainda não chegou {uf ? `a ${uf}` : "ao seu estado"}.
        </h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-fg">
          O registro de interesse avisa o atleta quando um clube for licenciado na região.
        </p>
        <div className="mt-8">
          <ListaEspera ufInicial={uf} />
        </div>
      </div>
      <div className="relative isolate flex flex-col justify-between bg-surface p-6 md:p-10">
        <img
          src={chuteAsset}
          alt="Sparring de karatê em treino noturno"
          loading="lazy"
              decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-45"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in oklab, var(--surface) 55%, transparent), var(--surface) 92%)",
          }}
        />
        <div>
          <p className="eyebrow">Para senseis</p>
          <h3 className="mt-3 text-3xl leading-[0.9]">
            O primeiro clube
            <br />
            {uf ? `de ${uf}` : "do estado"}
          </h3>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-fg">
            O clube credenciado conduz a turma semanal no padrão da liga e define a própria
            mensalidade.
          </p>
        </div>
        <Link
          to="/sensei"
          className="mt-10 inline-flex min-h-13 items-center justify-center border border-foreground/40 px-6 text-sm font-semibold tracking-[0.14em] uppercase hover:border-foreground md:self-start"
        >
          Credenciar o primeiro clube do estado
        </Link>
      </div>
    </div>
  );
}

function ListaEspera({ ufInicial }: { ufInicial: string }) {
  const criarLeadFn = useServerFn(criarLead);
  const [pronto, setPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [dados, setDados] = useState<Dados>({
    nome: "",
    whatsapp: "",
    email: "",
    cidade: "",
    uf: ufInicial,
  });

  useEffect(() => {
    if (ufInicial) setDados((d) => ({ ...d, uf: ufInicial }));
  }, [ufInicial]);

  async function enviar() {
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
      setPronto("Interesse registrado. A liga avisa quando um clube for licenciado na sua região.");
    } catch {
      toast.error("Não conseguimos salvar seus dados. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) {
    return (
      <div className="border border-foreground/20 p-5">
        <p className="display text-lg">Tudo certo</p>
        <p className="mt-2 text-sm text-muted-fg">{pronto}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Nome completo">
        <TextInput value={dados.nome} autoComplete="name" onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <div className="grid grid-cols-[6rem_1fr] gap-4">
        <Field label="Estado">
          <SelectInput value={dados.uf} onChange={(e) => setDados({ ...dados, uf: e.target.value })}>
            <option value="">UF</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Cidade">
          <TextInput value={dados.cidade} onChange={(e) => setDados({ ...dados, cidade: e.target.value })} />
        </Field>
      </div>
      <Check checked={aceite} onChange={setAceite}>
        Autorizo o contato e o uso dos meus dados conforme a{" "}
        <Link to="/privacidade" className="text-foreground underline">
          Política de Privacidade
        </Link>
        .
      </Check>
      <Btn full disabled={enviando} onClick={() => void enviar()}>
        {enviando ? "Enviando" : "Registrar interesse"}
      </Btn>
    </div>
  );
}

function CardClube({ clube, onClick }: { clube: ClubeDaVitrine; onClick: () => void }) {
  const total =
    clube.mensalidade_centavos != null ? clube.mensalidade_centavos + clube.filiacao_liga_centavos : null;

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col overflow-hidden border border-line bg-surface text-left hover:border-foreground/40"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={clube.foto_url ?? rotinaAsset.url}
          alt={clube.clube}
          loading="lazy"
              decoding="async"
          className="h-full w-full object-cover grayscale group-hover:grayscale-0"
        />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, var(--card), transparent 70%)" }} />
        <span className="eyebrow absolute top-3 left-3 border border-foreground/30 bg-background/70 px-2 py-1 text-foreground">
          {clube.cidade}/{clube.uf}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="display text-lg">{clube.clube}</div>
        <div className="mt-1 text-xs text-muted-fg">{clube.graduacao ?? clube.responsavel}</div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <div>
            <div className="display text-2xl">{clube.piloto ? brl(clube.mensalidade_centavos) : brl(total)}</div>
            <div className="text-[11px] text-muted-fg">
              {clube.piloto
                ? "por mês · filiação à liga em cortesia"
                : `por mês · ${brl(clube.mensalidade_centavos)} clube + ${brl(clube.filiacao_liga_centavos)} liga`}
            </div>
          </div>
          <span className="eyebrow text-foreground">Ver →</span>
        </div>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- FAQ */

function Faq({ filiacao }: { filiacao: number }) {
  const itens = [
    [
      "Quanto custa?",
      `Você paga uma mensalidade única: o valor definido pelo seu clube mais ${brl(filiacao)} da filiação à liga. O total aparece no card de cada clube antes do cadastro.`,
    ],
    [
      "Preciso sair do meu dojô?",
      "Não. A turma da liga é um treino semanal à parte. Você continua nas suas aulas regulares com o seu sensei.",
    ],
    ["Qual a idade mínima?", "18 anos. A liga é exclusiva para adultos."],
    [
      "Qual faixa é exigida?",
      "Nenhuma. Qualquer graduação pode participar, da branca à preta.",
    ],
    [
      "Como chego ao Legends Camp?",
      "Treinando com constância e subindo no ranking. A convocação passa por curadoria da liga.",
    ],
    [
      "Sou sensei. Como meu clube entra?",
      "Envie a aplicação na página para senseis. Após aprovação, seu clube ganha o link próprio de inscrição.",
    ],
  ];
  return (
    <section id="faq" className="scroll-mt-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[1fr_2fr] md:px-10 md:py-36">
        <div>
          <p className="eyebrow">Perguntas</p>
          <h2 className="mt-4 text-4xl leading-[0.9] md:text-5xl">O que todo mundo pergunta</h2>
        </div>
        <div className="border-t border-line">
          {itens.map(([p, r]) => (
            <details key={p} className="group border-b border-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="display text-base md:text-lg">{p}</span>
                <span className="display text-xl text-muted-fg group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-fg">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Rodapé */

function Rodape() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <MarcaCompacta />
        <div className="flex flex-wrap gap-6">
          <Link to="/ranking" className="eyebrow hover:text-foreground">
            Ranking
          </Link>
          <Link to="/sensei" className="eyebrow hover:text-foreground">
            Para senseis
          </Link>
          <Link to="/termos" className="eyebrow hover:text-foreground">
            Termos
          </Link>
          <Link to="/privacidade" className="eyebrow hover:text-foreground">
            Privacidade
          </Link>
          <Link to="/auth" className="eyebrow hover:text-foreground">
            Entrar
          </Link>
        </div>
        <p className="text-xs text-muted-fg">© {new Date().getFullYear()} Karate Legends Sparring</p>
      </div>
    </footer>
  );
}
