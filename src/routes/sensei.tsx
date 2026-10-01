import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { OG_IMAGE } from "@/lib/config";
import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { criarAplicacaoSensei, getAppConfig } from "@/lib/app.functions";
import { brl } from "@/lib/preco";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/sensei")({
  head: () => ({
    meta: [
      { title: "Licencie seu clube na World League · Karate Legends Sparring" },
      {
        name: "description",
        content:
          "Clube licenciado da liga: treino semanal de sparring, ranking oficial, caminho para o Legends Camp e mensalidade definida por você.",
      },
      { property: "og:title", content: "Licencie seu clube na World League" },
      {
        property: "og:description",
        content:
          "Treino semanal de sparring, ranking oficial e o Legends Camp. Você define a mensalidade e recebe direto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: PaginaSensei,
});

const GRADUACOES = [
  "1º Dan",
  "2º Dan",
  "3º Dan",
  "4º Dan",
  "5º Dan",
  "6º Dan",
  "7º Dan",
  "8º Dan",
  "Outra",
];

const TEMPOS = ["menos de 5", "5 a 10", "10 a 20", "mais de 20"];

const PASSOS = [
  "Aplique e seja aprovado pela curadoria da liga.",
  "Cadastre a sede, o dia do treino semanal e a mensalidade do clube.",
  "Divulgue o link exclusivo do seu clube e autorize seus atletas.",
  "Conduza o treino com o método da liga. Seus atletas marcam presença, sobem no ranking e disputam a convocação para o Legends Camp.",
];

function PaginaSensei() {
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => getAppConfig() });
  const n = config?.numeros;
  const [form, setForm] = useState({
    nome: "",
    dojo: "",
    cidade: "",
    uf: "",
    whatsapp: "",
    email: "",
    graduacao: "",
    tempo_ensino: "",
    instagram: "",
  });
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (form.nome.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (!form.dojo.trim() || !form.cidade.trim() || !form.uf) {
      toast.error("Informe dojô, cidade e estado.");
      return;
    }
    if (form.whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Informe um WhatsApp válido.");
      return;
    }
    if (!isEmail(form.email)) {
      toast.error("Informe um email válido.");
      return;
    }
    if (!aceite) {
      toast.error("É necessário autorizar o contato.");
      return;
    }
    setEnviando(true);
    try {
      await criarAplicacaoSensei({
        data: {
          nome: form.nome.trim(),
          dojo: form.dojo.trim(),
          cidade: form.cidade.trim(),
          uf: form.uf,
          whatsapp: form.whatsapp,
          email: form.email.trim(),
          graduacao: form.graduacao || null,
          tempo_ensino: form.tempo_ensino || null,
          instagram: form.instagram.trim() || null,
        },
      });
      setEnviado(true);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Não conseguimos enviar sua aplicação. Verifique a conexão e tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="mb-12">
          <Wordmark size="sm" />
          <h1 className="mt-10 text-[10vw] leading-[0.9] sm:text-5xl">
            Licencie seu clube na World League
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-fg">
            Chancela da liga, treino semanal de sparring, ranking oficial e caminho para o Legends
            Camp. Você define a mensalidade e recebe direto.
          </p>
        </header>

        <section className="mb-14 space-y-8 border-y border-line py-10">
          <div>
            <div className="fight-number text-brand">{brl(n?.anuidade_centavos ?? null)}</div>
            <p className="mt-2 text-sm text-muted-fg">
              por ano de licença do clube, ou {brl(n?.anuidade_mensal_centavos ?? null)}/mês. Os 12
              meses contam a partir da ativação do seu link.
            </p>
          </div>
          <div>
            <div className="fight-number">{brl(n?.anuidade_unidade_extra_centavos ?? null)}</div>
            <p className="mt-2 text-sm text-muted-fg">
              por unidade extra ao ano, ou {brl(n?.anuidade_unidade_extra_mensal_centavos ?? null)}
              /mês
            </p>
          </div>
          <div>
            <div className="fight-number">Seu preço</div>
            <p className="mt-2 text-sm text-muted-fg">
              Você define a mensalidade do clube (mínimo {brl(n?.mensalidade_minima_centavos ?? null)}
              ). O atleta paga junto a filiação à liga de{" "}
              {brl(n?.filiacao_liga_centavos ?? null)}, e o seu valor cai direto na sua conta.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-2xl">Como funciona</h2>
          <ol className="space-y-5">
            {PASSOS.map((p, i) => (
              <li key={p} className="flex gap-4">
                <span className="display w-8 shrink-0 text-lg text-brand">{i + 1}</span>
                <span className="text-sm leading-relaxed text-muted-fg">{p}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-6 text-2xl">Aplicação</h2>
          {enviado ? (
            <div className="cut-in border border-line bg-surface p-6">
              <p className="text-sm leading-relaxed text-muted-fg">
                Aplicação recebida. Nossa equipe retorna em até 48h no seu WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Nome completo">
                <TextInput
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </Field>
              <Field label="Nome do dojô">
                <TextInput
                  value={form.dojo}
                  onChange={(e) => setForm({ ...form, dojo: e.target.value })}
                />
              </Field>
              <Field label="Cidade">
                <TextInput
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </Field>
              <Field label="Estado">
                <SelectInput
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="WhatsApp">
                <TextInput
                  value={form.whatsapp}
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setForm({ ...form, whatsapp: maskWhatsapp(e.target.value) })}
                />
              </Field>
              <Field label="Email">
                <TextInput
                  value={form.email}
                  type="email"
                  inputMode="email"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Graduação">
                <SelectInput
                  value={form.graduacao}
                  onChange={(e) => setForm({ ...form, graduacao: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {GRADUACOES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Há quantos anos você ensina">
                <SelectInput
                  value={form.tempo_ensino}
                  onChange={(e) => setForm({ ...form, tempo_ensino: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {TEMPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Instagram do dojô (opcional)">
                <TextInput
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
              </Field>
              <Check checked={aceite} onChange={setAceite}>
                Autorizo o contato e o uso dos meus dados conforme a{" "}
                <a href="#" className="text-foreground underline">
                  Política de Privacidade
                </a>
                .
              </Check>
              <Btn full disabled={enviando} onClick={enviar}>
                {enviando ? "Enviando" : "Enviar aplicação"}
              </Btn>
            </div>
          )}
        </section>

        <footer className="mt-16 border-t border-line pt-6">
          <Link to="/" className="eyebrow hover:text-foreground">
            ← Sou atleta
          </Link>
        </footer>
      </div>
    </main>
  );
}
