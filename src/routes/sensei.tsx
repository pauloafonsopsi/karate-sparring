import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { criarAplicacaoSensei } from "@/lib/app.functions";
import { UFS, isEmail, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/sensei")({
  head: () => ({
    meta: [
      { title: "Leve o Karate Sparring para o seu dojô · by Legends" },
      {
        name: "description",
        content:
          "Programa nacional de sparring aos sábados. Você conduz, a metodologia chega pronta toda semana. Aplique como sensei licenciado.",
      },
      { property: "og:title", content: "Leve o Karate Sparring para o seu dojô" },
      {
        property: "og:description",
        content:
          "Programa nacional de sparring aos sábados. R$ 80 líquidos por aluno mensal, direto na sua conta.",
      },
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
  "Você recebe acesso à biblioteca de técnicas e ao roteiro de cada sábado.",
  "Um vídeo curto por semana ensina você a conduzir o treino.",
  "45 minutos de drills, depois sparring rotativo sob sua gestão.",
  "A lição final chega em vídeo e por escrito, com guia de fala.",
  "Seus alunos se inscrevem pelo SEU link e o repasse cai automático.",
];

function PaginaSensei() {
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
            Leve o Karate Sparring para o seu dojô
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-fg">
            Programa nacional de sparring aos sábados. Você conduz, a metodologia chega pronta toda
            semana.
          </p>
        </header>

        <section className="mb-14 space-y-8 border-y border-line py-10">
          <div>
            <div className="fight-number text-brand">R$ 80</div>
            <p className="mt-2 text-sm text-muted-fg">
              por aluno mensal, líquido, direto na sua conta
            </p>
          </div>
          <div>
            <div className="fight-number">R$ 20</div>
            <p className="mt-2 text-sm text-muted-fg">por treino avulso</p>
          </div>
          <div>
            <div className="fight-number">3 alunos</div>
            <p className="mt-2 text-sm text-muted-fg">pagam sua adesão anual</p>
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

        <section className="mb-14 border border-line bg-surface p-6">
          <h2 className="mb-4 text-xl">Investimento</h2>
          <p className="text-sm leading-relaxed text-muted-fg">
            Condição de fundador: 1º ano por R$ 1.800 em 12x de R$ 150 no cartão parcelado. No Pix
            mensal, são 12 parcelas de R$ 200. A partir do 2º ano: R$ 2.400/ano.
          </p>
          <Link to="/adesao" className="mt-6 block">
            <Btn full>Fazer minha adesão anual</Btn>
          </Link>
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
