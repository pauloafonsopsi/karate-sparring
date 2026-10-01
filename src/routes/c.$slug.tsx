import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { OG_IMAGE } from "@/lib/config";
import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { criarContaAtleta } from "@/lib/atleta.functions";
import { getClubePublico } from "@/lib/clube.functions";
import { FAIXAS } from "@/lib/faixas";
import { brl } from "@/lib/preco";
import { nomeDia } from "@/lib/semana";
import { isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/c/$slug")({
  loader: ({ params }) => getClubePublico({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const nome = loaderData?.clube ?? "Clube Licenciado KLS";
    const desc = loaderData
      ? `${nome} em ${loaderData.cidade}/${loaderData.uf}: turma semanal de sparring com o método da Karate Legends Sparring World League.`
      : "Clube licenciado da Karate Legends Sparring World League.";
    return {
      meta: [
        { title: `${nome} · Clube Licenciado KLS` },
        { name: "description", content: desc },
        { property: "og:title", content: `${nome} · Clube Licenciado KLS` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:image", content: OG_IMAGE },
      ],
    };
  },
  errorComponent: () => (
    <Vazio texto="Não conseguimos carregar este clube agora. Tente de novo em instantes." />
  ),
  notFoundComponent: () => <Vazio texto="Clube não encontrado." />,
  component: PaginaClube,
});

function Vazio({ texto }: { texto: string }) {
  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <Wordmark size="sm" />
        <p className="mt-10 border border-line bg-surface p-6 text-sm text-muted-fg">{texto}</p>
        <Link to="/" className="eyebrow mt-6 inline-block hover:text-foreground">
          ← Voltar
        </Link>
      </div>
    </main>
  );
}

function PaginaClube() {
  const clube = Route.useLoaderData();
  const navigate = useNavigate();
  const criarContaFn = useServerFn(criarContaAtleta);
  const abertoEm = useRef(Date.now());

  const [unidadeId, setUnidadeId] = useState("");
  const [f, setF] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    email_confirmacao: "",
    data_nascimento: "",
    faixa: "",
    senha: "",
    isca: "",
  });
  const [aceites, setAceites] = useState({
    termos: false,
    lgpd: false,
    ranking: false,
    marketing: false,
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (clube && clube.unidades.length > 0 && !unidadeId) {
      setUnidadeId(clube.unidades[0]!.id);
    }
  }, [clube, unidadeId]);

  if (!clube) return <Vazio texto="Clube não encontrado ou ainda sem link publicado." />;

  const unidade = clube.unidades.find((u) => u.id === unidadeId) ?? clube.unidades[0] ?? null;
  const total =
    clube.mensalidade_centavos != null
      ? clube.mensalidade_centavos + clube.filiacao_liga_centavos
      : null;

  async function criarConta() {
    const problema =
      f.nome.trim().length < 3
        ? "Informe seu nome completo."
        : f.whatsapp.replace(/\D/g, "").length < 10
          ? "Informe um WhatsApp válido."
          : !isEmail(f.email)
            ? "Informe um email válido."
            : f.email.trim().toLowerCase() !== f.email_confirmacao.trim().toLowerCase()
              ? "Os dois emails precisam ser iguais."
              : !/^\d{4}-\d{2}-\d{2}$/.test(f.data_nascimento)
                ? "Informe sua data de nascimento."
                : !f.faixa
                  ? "Selecione sua graduação."
                  : f.senha.length < 8
                    ? "A senha precisa ter ao menos 8 caracteres."
                    : !unidadeId
                      ? "Selecione a unidade onde você vai treinar."
                      : !aceites.termos || !aceites.lgpd || !aceites.ranking
                        ? "É necessário aceitar os três itens para criar a conta."
                        : null;
    if (problema) {
      toast.error(problema);
      return;
    }

    setEnviando(true);
    try {
      const email = f.email.trim().toLowerCase();
      await criarContaFn({
        data: {
          nome: f.nome.trim(),
          whatsapp: f.whatsapp,
          email,
          email_confirmacao: f.email_confirmacao.trim().toLowerCase(),
          data_nascimento: f.data_nascimento,
          faixa: f.faixa as (typeof FAIXAS)[number],
          senha: f.senha,
          unidade_id: unidadeId,
          aceite_termos: true as const,
          aceite_lgpd: true as const,
          aceite_ranking: true as const,
          aceite_marketing_eventos: aceites.marketing,
          isca: f.isca,
          duracao_ms: Date.now() - abertoEm.current,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.senha });
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

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="flex items-center justify-between gap-4">
          <Wordmark size="sm" />
          <span className="eyebrow border border-line px-3 py-2">Clube licenciado</span>
        </header>

        <section className="mt-10">
          <div className="flex items-start gap-4">
            {clube.foto_url ? (
              <img
                src={clube.foto_url}
                alt={clube.responsavel}
                className="h-20 w-20 shrink-0 object-cover grayscale"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-3xl leading-none">{clube.clube}</h1>
              <p className="mt-3 text-sm text-muted-fg">
                {clube.responsavel}
                {clube.graduacao ? ` · ${clube.graduacao}` : ""}
              </p>
              <p className="text-sm text-muted-fg">
                {clube.cidade}/{clube.uf}
              </p>
            </div>
          </div>
        </section>

        {unidade && (
          <section className="mt-8 border border-line bg-surface p-6">
            <p className="eyebrow">Sparring semanal</p>
            <p className="display mt-3 text-xl">
              {unidade.dia_aula
                ? `${nomeDia(unidade.dia_aula)} às ${(unidade.horario_aula ?? "").slice(0, 5)}`
                : "Dia a confirmar com o clube"}
            </p>
            <p className="mt-1 text-sm text-muted-fg">
              {unidade.duracao_minutos} minutos · {unidade.nome}
            </p>
            {unidade.endereco && <p className="mt-3 text-sm text-muted-fg">{unidade.endereco}</p>}
          </section>
        )}

        <section className="mt-4 border border-line bg-surface p-6">
          <p className="eyebrow">Quanto custa</p>
          {clube.piloto ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-fg">Mensalidade do clube</dt>
                <dd className="text-right">
                  {brl(clube.mensalidade_centavos)}
                  <span className="block text-xs text-muted-fg">paga direto ao clube</span>
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted-fg">Filiação à liga</dt>
                <dd className="text-right text-brand">cortesia no período piloto</dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-fg">Mensalidade do clube</dt>
                <dd className="text-right">{brl(clube.mensalidade_centavos)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-fg">Filiação à liga</dt>
                <dd className="text-right">{brl(clube.filiacao_liga_centavos)}</dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-line pt-3">
                <dt className="eyebrow">Total por mês</dt>
                <dd className="fight-number text-2xl">{brl(total)}</dd>
              </div>
            </dl>
          )}
        </section>

        {!clube.inscricoes_abertas ? (
          <p className="mt-8 border border-line bg-surface p-6 text-sm text-muted-fg">
            As inscrições da liga estão temporariamente fechadas. Volte em breve.
          </p>
        ) : (
          <section className="mt-10">
            <div className="mb-6 flex items-end gap-4">
              <span className="fight-number text-brand">01</span>
              <h2 className="pb-1 text-2xl">Peça sua entrada no clube</h2>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-muted-fg">
              Seu cadastro vai para {clube.responsavel.split(" ")[0]} autorizar. Depois da
              autorização você libera o passaporte e entra no ranking.
            </p>

            <div className="space-y-4">
              {clube.unidades.length > 1 && (
                <Field label="Onde você vai treinar">
                  <SelectInput value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                    {clube.unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                        {u.endereco ? ` · ${u.endereco}` : ""}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              )}

              <Field label="Nome completo">
                <TextInput
                  value={f.nome}
                  autoComplete="name"
                  onChange={(e) => setF({ ...f, nome: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp">
                <TextInput
                  value={f.whatsapp}
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setF({ ...f, whatsapp: maskWhatsapp(e.target.value) })}
                />
              </Field>
              <Field label="Email">
                <TextInput
                  value={f.email}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </Field>
              <Field label="Confirme o email" hint="Digite de novo, sem copiar e colar.">
                <TextInput
                  value={f.email_confirmacao}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  onChange={(e) => setF({ ...f, email_confirmacao: e.target.value })}
                />
              </Field>
              <Field label="Data de nascimento">
                <TextInput
                  value={f.data_nascimento}
                  type="date"
                  onChange={(e) => setF({ ...f, data_nascimento: e.target.value })}
                />
              </Field>
              <Field label="Sua graduação">
                <SelectInput
                  value={f.faixa}
                  onChange={(e) => setF({ ...f, faixa: e.target.value })}
                >
                  <option value="">Selecione sua faixa</option>
                  {FAIXAS.map((faixa) => (
                    <option key={faixa} value={faixa}>
                      {faixa}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Senha" hint="Mínimo de 8 caracteres.">
                <TextInput
                  value={f.senha}
                  type="password"
                  autoComplete="new-password"
                  onChange={(e) => setF({ ...f, senha: e.target.value })}
                />
              </Field>

              <input
                type="text"
                name="empresa"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={f.isca}
                onChange={(e) => setF({ ...f, isca: e.target.value })}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />

              <Check
                checked={aceites.termos}
                onChange={(v) => setAceites({ ...aceites, termos: v })}
              >
                Aceito os{" "}
                <Link to="/termos" className="text-foreground underline">
                  Termos de Participação
                </Link>{" "}
                da World League.
              </Check>
              <Check checked={aceites.lgpd} onChange={(v) => setAceites({ ...aceites, lgpd: v })}>
                Autorizo o contato e o uso dos meus dados conforme a{" "}
                <Link to="/privacidade" className="text-foreground underline">
                  Política de Privacidade
                </Link>
                .
              </Check>
              <Check
                checked={aceites.ranking}
                onChange={(v) => setAceites({ ...aceites, ranking: v })}
              >
                Autorizo a exibição do meu nome e clube conforme as{" "}
                <Link to="/ranking" className="text-foreground underline">
                  regras do ranking
                </Link>
                .
              </Check>
              <Check
                checked={aceites.marketing}
                onChange={(v) => setAceites({ ...aceites, marketing: v })}
              >
                Quero receber avisos de eventos e transmissões da liga. (opcional)
              </Check>

              <Btn full disabled={enviando} onClick={() => void criarConta()}>
                {enviando ? "Enviando pedido" : "Pedir entrada no clube"}
              </Btn>
            </div>

            <p className="mt-6 text-xs text-muted-fg">
              Já tem conta?{" "}
              <Link to="/auth" className="text-foreground underline">
                Entrar
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
