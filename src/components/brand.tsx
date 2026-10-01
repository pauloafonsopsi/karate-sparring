/** Monograma provisório KLS, até o logo oficial chegar. */
export function Monograma({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="KLS">
      <rect x="1.5" y="1.5" width="45" height="45" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold" />
      <rect x="5" y="5" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-line" />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontFamily="Archivo Black, Arial Black, sans-serif"
        fontSize="15"
        letterSpacing="-0.5"
        fill="currentColor"
        className="text-foreground"
      >
        KLS
      </text>
    </svg>
  );
}

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const title =
    size === "lg"
      ? "text-[8vw] leading-[0.88] sm:text-5xl"
      : size === "sm"
        ? "text-base leading-none"
        : "text-2xl leading-none sm:text-3xl";
  const sub =
    size === "lg"
      ? "text-[2.6vw] sm:text-sm"
      : size === "sm"
        ? "text-[9px]"
        : "text-[10px] sm:text-xs";

  return (
    <div className="select-none">
      <div className={`display uppercase ${title}`}>
        Karate Legends
        <br />
        Sparring
      </div>
      <div className={`display mt-2 uppercase text-brand ${sub}`} style={{ letterSpacing: "0.4em" }}>
        World League
      </div>
    </div>
  );
}

/** Marca compacta para cabeçalhos: monograma + nome em uma linha. */
export function MarcaCompacta() {
  return (
    <div className="flex min-w-0 items-center gap-3 select-none">
      <Monograma className="h-9 w-9 shrink-0" />
      <div className="min-w-0 leading-none">
        <div className="display truncate text-sm">Karate Legends Sparring</div>
        <div className="mt-1 text-[9px] font-semibold tracking-[0.4em] text-muted-fg uppercase">
          World League
        </div>
      </div>
    </div>
  );
}

export function Rule() {
  return <div className="h-px w-full bg-line" />;
}
