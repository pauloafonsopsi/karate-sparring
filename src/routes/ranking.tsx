import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { MarcaCompacta } from "@/components/brand";
import { getAppConfig } from "@/lib/app.functions";
import { OG_IMAGE } from "@/lib/config";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking da liga · Karate Legends Sparring" },
      {
        name: "description",
        content: "Como funciona o ranking da World League: pontos por presença, constância e cursos, e a zona de convocação para o Legends Camp.",
      },
      { property: "og:title", content: "Ranking · Karate Legends Sparring" },
      { property: "og:description", content: "Pontos por presença, constância e cursos. Os melhores disputam o Legends Camp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: Ranking,
});

function Ranking() {
  const { data: config } = useQuery({ queryKey: ["app-config"], queryFn: () => getAppConfig() });
  const n = config?.numeros;
  const regras = [
    [`+${n?.pontos_presenca ?? 10}`, "Treinou", "Treino semanal concluído e confirmado pelo clube."],
    [
      `+${n?.pontos_assistiu ?? 5}`,
      "Assistiu",
      "Presente sem treinar, ou sem completar o treino. Mantém a constância.",
    ],
    [
      `+${n?.pontos_sequencia ?? 15}`,
      "Constância",
      `Bônus a cada ${n?.semanas_constancia ?? 4} semanas seguidas sem falta.`,
    ],
    ["Zera", "Falta", "A semana sem presença zera a sequência de constância."],
    [`+${n?.pontos_curso ?? 25}`, "Curso concluído", "Todos os vídeos da trilha concluídos."],
  ];
  const vagas = n?.vagas_camp ?? 20;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Link to="/" aria-label="Karate Legends Sparring">
          <MarcaCompacta />
        </Link>
        <Link to="/auth" className="eyebrow border border-foreground/30 px-4 py-2.5 hover:border-foreground">
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-5 pt-16 pb-24 md:px-10 md:pt-24 md:pb-32">
        <p className="eyebrow text-gold-soft">Temporada inaugural · World League</p>
        <h1 className="mt-5 text-[14vw] leading-[0.86] md:text-8xl">Ranking</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80">
          Treinar conta. Assistir mantém a sequência. Faltar recomeça a constância.
        </p>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-5">
          {regras.map(([pts, t, d]) => (
            <div key={t} className="bg-background px-5 py-12 lg:px-6">
              <p className="fight-number">{pts}</p>
              <h2 className="mt-4 text-2xl">{t}</h2>
              <p className="mt-2 text-sm text-muted-fg">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
          <div className="mb-20 grid gap-8 border-b border-line pb-20 md:grid-cols-[1fr_2fr]">
            <h2 className="text-3xl md:text-4xl">Uma temporada por vez</h2>
            <div className="space-y-4 text-sm leading-7 text-muted-fg">
              <p>
                Os pontos valem somente dentro da temporada em que foram conquistados. Ao iniciar uma
                nova temporada, começa uma nova classificação.
              </p>
              <p>
                O Legends Camp acontece ao fim de cada temporada. O Top {vagas} forma a zona de
                convocação, mas a convocação final passa pela curadoria da liga.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-4xl leading-[0.9] md:text-6xl">Classificação</h2>
            <p className="eyebrow">Top {vagas} · zona de convocação</p>
          </div>
          <div className="mt-10 border border-line">
            <div className="grid grid-cols-[3rem_1fr_auto] gap-4 border-b border-line px-5 py-3 eyebrow md:grid-cols-[4rem_1fr_1fr_6rem_6rem]">
              <span>#</span>
              <span>Atleta</span>
              <span className="hidden md:block">Clube</span>
              <span className="hidden md:block">Semanas</span>
              <span className="text-right">Pontos</span>
            </div>
            <div className="px-5 py-16 text-center">
              <p className="display text-xl">Temporada em credenciamento</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-muted-fg">
                A classificação aparece aqui assim que os primeiros clubes começarem a treinar.
              </p>
            </div>
            <div className="gold-rule" />
          </div>
          <p className="mt-6 text-xs text-muted-fg">
            A convocação para o Legends Camp passa por curadoria da liga. Estar na zona é o caminho, não a garantia.
          </p>
          <Link
            to="/"
            hash="clubes"
            className="mt-12 inline-flex min-h-14 items-center bg-brand px-8 text-sm font-semibold tracking-[0.14em] text-background uppercase hover:bg-gold-soft"
          >
            Buscar clube
          </Link>
        </div>
      </section>
    </main>
  );
}
