import { createFileRoute, Link } from "@tanstack/react-router";

import { MarcaCompacta } from "@/components/brand";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Participação · Karate Legends Sparring" },
      {
        name: "description",
        content: "Termos preliminares de participação na Karate Legends Sparring World League.",
      },
      { property: "og:title", content: "Termos de Participação · Karate Legends Sparring" },
      {
        property: "og:description",
        content: "Regras preliminares para atletas e clubes participantes da World League.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Termos,
});

const secoes = [
  {
    titulo: "1. Quem pode participar",
    texto:
      "A World League é destinada a atletas com 18 anos ou mais, de qualquer graduação. O cadastro não garante entrada imediata: o clube escolhido precisa autorizar o vínculo, e pode aplicar critérios próprios de segurança, capacidade da turma e conduta.",
  },
  {
    titulo: "2. Rotina e responsabilidade",
    texto:
      "A atividade principal é uma turma semanal de sparring em uma unidade de clube licenciado. O atleta deve respeitar as orientações do instrutor, as regras do clube, usar os equipamentos exigidos e informar qualquer condição que possa afetar sua segurança. A prática esportiva envolve riscos próprios de atividade física e contato.",
  },
  {
    titulo: "3. Presença e verificação",
    texto:
      "Na etapa de presença, cada semana poderá ser registrada como Treinou, Assistiu ou Falta. O check-in poderá usar a localização pontual do aparelho para confirmar a proximidade da unidade. No modo verificação, uma foto da turma poderá ser registrada para conferência da chamada. Esses recursos não substituem a validação do instrutor.",
  },
  {
    titulo: "4. Ranking por temporada",
    texto:
      "Os pontos seguem as regras publicadas na página Ranking e valem apenas na temporada correspondente. Treinos, presença como espectador, constância e cursos concluídos podem gerar pontos. Correções justificadas poderão ser feitas pela liga ou pelo clube quando houver erro de registro.",
  },
  {
    titulo: "5. Legends Camp",
    texto:
      "Ao fim de cada temporada, o Top 20 forma a zona de convocação para o Legends Camp. A posição no ranking não garante convocação: a decisão passa por curadoria da liga, considerando critérios técnicos, disciplinares, de segurança e disponibilidade do evento.",
  },
  {
    titulo: "6. Conta e conduta",
    texto:
      "O participante é responsável por manter seus dados corretos e sua senha protegida. Fraude de presença, uso indevido de conta, assédio, violência incompatível com a prática esportiva ou desrespeito às regras podem levar à correção de registros, suspensão ou encerramento da participação, assegurada análise do caso.",
  },
  {
    titulo: "7. Alterações e encerramento",
    texto:
      "Regras operacionais podem evoluir antes da abertura oficial de cada etapa. Mudanças relevantes serão informadas no app. O participante pode pedir o encerramento da conta, sujeito à conservação dos registros necessários para cumprir obrigações legais, resolver disputas e preservar a integridade histórica da temporada.",
  },
];

function Termos() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 md:px-10">
        <Link to="/" aria-label="Karate Legends Sparring">
          <MarcaCompacta />
        </Link>
        <Link to="/privacidade" className="eyebrow hover:text-foreground">
          Privacidade
        </Link>
      </header>

      <article className="mx-auto max-w-4xl px-5 pt-14 pb-24 md:px-10 md:pt-20 md:pb-32">
        <p className="eyebrow text-gold-soft">Versão preliminar · 1º de outubro de 2026</p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[0.92] md:text-7xl">Termos de participação</h1>
        <div className="mt-8 border border-line bg-surface p-5 text-sm leading-relaxed text-foreground/80">
          Este documento é uma versão preliminar e passará por revisão jurídica antes da abertura
          pública definitiva.
        </div>

        <div className="mt-14 divide-y divide-line border-t border-line">
          {secoes.map((secao) => (
            <section key={secao.titulo} className="grid gap-4 py-8 md:grid-cols-[15rem_1fr] md:py-10">
              <h2 className="text-lg leading-tight">{secao.titulo}</h2>
              <p className="text-sm leading-7 text-muted-fg">{secao.texto}</p>
            </section>
          ))}
        </div>

        <section className="border-t border-line pt-8">
          <h2 className="text-lg">8. Privacidade</h2>
          <p className="mt-4 text-sm leading-7 text-muted-fg">
            O tratamento dos dados pessoais está detalhado na{" "}
            <Link to="/privacidade" className="text-foreground underline">
              Política de Privacidade
            </Link>
            , que integra estes termos.
          </p>
        </section>
      </article>
    </main>
  );
}