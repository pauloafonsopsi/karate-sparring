import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Badge, Btn, Field, TextInput } from "@/components/kit";
import { consultarAdesao, type SituacaoAdesao } from "@/lib/adesao.functions";
import { isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/minha-adesao")({
  head: () => ({
    meta: [
      { title: "Status da minha adesão · Karate Sparring" },
      {
        name: "description",
        content:
          "Consulte a situação da sua adesão anual de sensei no Karate Sparring: cobrança criada, paga ou duplicada.",
      },
      { property: "og:title", content: "Status da minha adesão · Karate Sparring" },
      {
        property: "og:description",
        content: "Veja se a sua adesão de sensei foi criada, paga ou se há cobrança duplicada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaMinhaAdesao,
});

const reais = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function PaginaMinhaAdesao() {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const consulta = useMutation({
    mutationFn: () => consultarAdesao({ data: { email: email.trim(), whatsapp } }),
    onError: () => toast.error("Não conseguimos consultar agora. Tente novamente em instantes."),
  });

  function buscar() {
    if (!isEmail(email)) {
      toast.error("Informe o email usado na inscrição.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Informe o WhatsApp usado na inscrição.");
      return;
    }
    consulta.mutate();
  }

  const r = consulta.data as SituacaoAdesao | undefined;

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="mb-12">
          <Wordmark size="sm" />
          <p className="eyebrow mt-10 text-brand">Sensei · acompanhamento</p>
          <h1 className="mt-4 text-[10vw] leading-[0.9] sm:text-5xl">Status da minha adesão</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-fg">
            Informe o email e o WhatsApp da sua inscrição para ver se a cobrança foi criada, paga ou
            se existe cobrança duplicada.
          </p>
        </header>

        <section className="space-y-4">
          <Field label="Email da inscrição">
            <TextInput
              value={email}
              type="email"
              inputMode="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="WhatsApp da inscrição">
            <TextInput
              value={whatsapp}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
            />
          </Field>
          <Btn full disabled={consulta.isPending} onClick={buscar}>
            {consulta.isPending ? "Consultando" : "Consultar"}
          </Btn>
        </section>

        {r && !r.encontrado ? (
          <section className="mt-12 border-y border-line py-10">
            <p className="text-sm leading-relaxed text-muted-fg">
              Não encontramos uma inscrição com esse email e WhatsApp. Confira os dados ou faça sua
              inscrição em{" "}
              <Link to="/adesao" className="text-brand">
                adesão anual
              </Link>
              .
            </p>
          </section>
        ) : null}

        {r?.encontrado ? (
          <section className="mt-12 space-y-10">
            <div className="border-y border-line py-10">
              <p className="eyebrow text-muted-fg">
                {r.nome} · {r.dojo}
              </p>
              <div className="fight-number mt-4 text-brand">
                {r.status === "paga"
                  ? "Adesão paga"
                  : r.status === "pendente"
                    ? "Aguardando pagamento"
                    : "Sem cobrança"}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-fg">
                {r.status === "paga"
                  ? "Sua adesão está confirmada. O sensei responsável entra em contato com o roteiro semanal."
                  : r.status === "pendente"
                    ? "Sua cobrança já foi criada. Use o link abaixo para concluir o pagamento."
                    : "Sua inscrição está registrada, mas ainda não há cobrança criada. Nossa equipe fala com você no WhatsApp."}
              </p>
              {r.status === "pendente" && r.invoice_url ? (
                <a href={r.invoice_url} target="_blank" rel="noreferrer" className="mt-6 block">
                  <Btn full>Abrir minha cobrança</Btn>
                </a>
              ) : null}
            </div>

            {r.cobrancas?.length ? (
              <div>
                <h2 className="mb-6 text-2xl">Histórico de cobranças</h2>
                <ul className="space-y-3">
                  {r.cobrancas.map((c, i) => (
                    <li key={i} className="border border-line bg-surface p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          tone={
                            c.status === "confirmado"
                              ? "ativo"
                              : c.duplicada
                                ? "aplicou"
                                : "aprovado"
                          }
                        >
                          {c.duplicada ? "duplicada" : c.status}
                        </Badge>
                        <span className="text-sm text-muted-fg">
                          {data(c.criada_em)} · {reais(c.valor_total)} ·{" "}
                          {c.billing_type === "PIX" ? "Pix mensal" : "cartão parcelado"}
                        </span>
                      </div>
                      {c.duplicada ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted-fg">
                          Cobrança extra gerada por uma nova tentativa. Ignore: pague apenas a
                          cobrança principal acima.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="mt-16 flex flex-wrap gap-6 border-t border-line pt-6">
          <Link to="/adesao" className="eyebrow hover:text-foreground">
            ← Fazer minha adesão
          </Link>
          <Link to="/sensei" className="eyebrow hover:text-foreground">
            Conhecer o programa
          </Link>
        </footer>
      </div>
    </main>
  );
}
