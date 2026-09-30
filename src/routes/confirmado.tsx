import { createFileRoute, Link } from "@tanstack/react-router";

import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/confirmado")({
  head: () => ({
    meta: [
      { title: "Pré-inscrição recebida · Karate Legends Sparring" },
      {
        name: "description",
        content:
          "Sua pré-inscrição na World League foi recebida. Avisaremos você quando a liga abrir no seu dojô.",
      },
      { property: "og:title", content: "Pré-inscrição recebida · Karate Legends Sparring" },
      {
        property: "og:description",
        content: "Avisaremos você quando a liga abrir no seu dojô.",
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
        <h1 className="mt-4 text-3xl">Pré-inscrição recebida</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-fg">
          Avisaremos você quando a liga abrir no seu dojô.
        </p>
        <Link to="/" className="eyebrow mt-10 inline-block hover:text-foreground">
          ← Voltar ao início
        </Link>
      </div>
    </main>
  );
}
