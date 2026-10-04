import { Link } from "@tanstack/react-router";

export type LinhaRanking = { posicao: number; atleta: string; clube: string; pontos: number };

/** Top 10 público. Sem dados (etapa 1) mostra o estado de credenciamento. */
export function Top10({ linhas = [] }: { linhas?: LinhaRanking[] }) {
  const vagas = Array.from({ length: 10 }, (_, i) => linhas[i] ?? null);
  const vazio = linhas.length === 0;
  return (
    <div className="border border-line">
      <div className="grid grid-cols-[3rem_1fr_auto] gap-4 border-b border-line px-5 py-3 eyebrow">
        <span>#</span>
        <span>Atleta · clube</span>
        <span className="text-right">Pontos</span>
      </div>
      <ol className={vazio ? "opacity-40" : ""}>
        {vagas.map((l, i) => (
          <li
            key={i}
            className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-line px-5 py-3 last:border-b-0"
          >
            <span className={`display text-lg ${i < 3 && l ? "gold-text" : "text-foreground/40"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-sm">
              {l ? (
                <>
                  {l.atleta} <span className="text-muted-fg">· {l.clube}</span>
                </>
              ) : (
                <span className="block h-2 w-2/3 bg-foreground/10" />
              )}
            </span>
            <span className="text-right text-sm tabular-nums">{l ? l.pontos : "--"}</span>
          </li>
        ))}
      </ol>
      {vazio && (
        <div className="border-t border-line px-5 py-8 text-center">
          <p className="display text-lg">Temporada em credenciamento</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-fg">
            Os primeiros nomes aparecem aqui quando os clubes começarem a treinar.
          </p>
          <Link to="/" hash="clubes" className="eyebrow mt-5 inline-block border-b border-foreground/30 pb-1 text-foreground hover:border-foreground">
            Quero estar nessa lista
          </Link>
        </div>
      )}
      <div className="gold-rule" />
    </div>
  );
}
