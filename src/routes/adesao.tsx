import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { criarAdesaoPublica } from "@/lib/asaas.functions";
import { UFS, isEmail, maskCpf, maskWhatsapp } from "@/lib/ufs";

export const Route = createFileRoute("/adesao")({
  head: () => ({
    meta: [
      { title: "Adesão anual do sensei · Karate Sparring" },
      {
        name: "description",
        content:
          "Adesão anual do Karate Sparring: R$ 1.800 em 12x de R$ 150 no cartão, ou 12 mensalidades de R$ 200 no Pix. Inscreva seu dojô.",
      },
      { property: "og:title", content: "Adesão anual do sensei · Karate Sparring" },
      {
        property: "og:description",
        content: "R$ 1.800 em 12x de R$ 150 no cartão. No Pix mensal, 12x de R$ 200.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAdesao,
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

function PaginaAdesao() {
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
    cpf_cnpj: "",
  });
  const [billing, setBilling] = useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");
  const [aceite, setAceite] = useState(false);

  const enviar = useMutation({
    mutationFn: () =>
      criarAdesaoPublica({
        data: {
          nome: form.nome.trim(),
          dojo: form.dojo.trim(),
          cidade: form.cidade.trim(),
          uf: form.uf,
          whatsapp: form.whatsapp,
          email: form.email.trim(),
          graduacao: form.graduacao || undefined,
          tempo_ensino: form.tempo_ensino || undefined,
          instagram: form.instagram.trim() || undefined,
          cpf_cnpj: form.cpf_cnpj,
          billing_type: billing,
          aceite: true,
        },
      }),
    onSuccess: (r: { url: string }) => {
      if (r.url) window.location.href = r.url;
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Não conseguimos gerar sua cobrança. Tente novamente em instantes.",
      ),
  });

  function validarEEnviar(): void {
    const doc = form.cpf_cnpj.replace(/\D/g, "");
    const erro =
      form.nome.trim().length < 3
        ? "Informe seu nome completo."
        : !form.dojo.trim() || !form.cidade.trim() || !form.uf
          ? "Informe dojô, cidade e estado."
          : form.whatsapp.replace(/\D/g, "").length < 10
            ? "Informe um WhatsApp válido."
            : !isEmail(form.email)
              ? "Informe um email válido."
              : doc.length !== 11 && doc.length !== 14
                ? "Informe um CPF ou CNPJ válido."
                : !aceite
                  ? "É necessário aceitar os termos."
                  : null;
    if (erro) {
      toast.error(erro);
      return;
    }
    enviar.mutate();
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 pt-10 pb-20">
        <header className="mb-12">
          <Wordmark size="sm" />
          <p className="eyebrow mt-10 text-brand">Adesão anual · condição de fundador</p>
          <h1 className="mt-4 text-[10vw] leading-[0.9] sm:text-5xl">
            Inscreva seu dojô no Karate Sparring
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-fg">
            Um ano de metodologia, roteiro semanal e repasse automático dos seus alunos.
          </p>
        </header>

        <section className="mb-14 space-y-8 border-y border-line py-10">
          <div>
            <div className="fight-number text-brand">12x R$ 150</div>
            <p className="mt-2 text-sm text-muted-fg">
              no cartão parcelado · total R$ 1.800 no primeiro ano
            </p>
          </div>
          <div>
            <div className="fight-number">12x R$ 200</div>
            <p className="mt-2 text-sm text-muted-fg">
              no Pix mensal · o valor de R$ 150 vale apenas no cartão parcelado
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl">Seus dados</h2>
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
            <Field label="CPF ou CNPJ do pagador">
              <TextInput
                value={form.cpf_cnpj}
                inputMode="numeric"
                placeholder="000.000.000-00"
                onChange={(e) => setForm({ ...form, cpf_cnpj: maskCpf(e.target.value) })}
              />
            </Field>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-6 text-2xl">Forma de pagamento</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setBilling("CREDIT_CARD")}
              className={`border p-5 text-left ${
                billing === "CREDIT_CARD" ? "border-brand bg-surface" : "border-line"
              }`}
            >
              <span className="eyebrow">Cartão parcelado</span>
              <span className="mt-2 block text-2xl">12x R$ 150</span>
              <span className="mt-1 block text-xs text-muted-fg">total R$ 1.800</span>
            </button>
            <button
              onClick={() => setBilling("PIX")}
              className={`border p-5 text-left ${
                billing === "PIX" ? "border-brand bg-surface" : "border-line"
              }`}
            >
              <span className="eyebrow">Pix mensal</span>
              <span className="mt-2 block text-2xl">12x R$ 200</span>
              <span className="mt-1 block text-xs text-muted-fg">total R$ 2.400</span>
            </button>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted-fg">
            No Pix mensal, uma cobrança é gerada por mês durante 12 meses. O valor de R$ 150 por
            parcela existe apenas no cartão parcelado.
          </p>

          <div className="mt-6 space-y-5">
            <Check checked={aceite} onChange={setAceite}>
              Aceito os termos do programa e autorizo o contato sobre a minha adesão.
            </Check>
            <Btn full disabled={enviar.isPending} onClick={validarEEnviar}>
              {enviar.isPending ? "Gerando cobrança" : "Ir para o pagamento"}
            </Btn>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap gap-6 border-t border-line pt-6">
          <Link to="/sensei" className="eyebrow hover:text-foreground">
            ← Conhecer o programa
          </Link>
          <Link to="/" className="eyebrow hover:text-foreground">
            Sou atleta
          </Link>
        </footer>
      </div>
    </main>
  );
}
