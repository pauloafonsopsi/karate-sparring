import { createFileRoute, Link } from "@tanstack/react-router";

import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/confirmado")({
  head: () => ({
    meta: [
      { title: "Inscrição confirmada · Karate Sparring" },
      {
        name: "description",
        content:
          "Sua inscrição no Karate Sparring foi confirmada. Seu sensei entrará em contato com os detalhes do próximo sábado.",
      },
      { property: "og:title", content: "Inscrição confirmada · Karate Sparring" },
      {
        property: "og:description",
        content: "Seu sensei entrará em contato com os detalhes do próximo sábado.",
      },
    ],
  }),
  component: Confirmado,
});

function Confirmado() {
  return (
    <main className="grain flex min-h-screen items-center">
      <div className="mx-auto w-full max-w-xl px-5 py-20">
        <Wordmark size="sm" />
        <div className="fight-number mt-12 text-brand">OK</div>
        <h1 className="mt-4 text-3xl">Inscrição confirmada</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-fg">
          Seu sensei entrará em contato com os detalhes do próximo sábado.
        </p>
        <Link to="/" className="eyebrow mt-10 inline-block hover:text-foreground">
          ← Voltar ao início
        </Link>
      </div>
    </main>
  );
}
