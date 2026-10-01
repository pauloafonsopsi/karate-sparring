import logoCompleto from "@/assets/kls-logo-completo.webp.asset.json";
import simboloKls from "@/assets/kls-simbolo.webp.asset.json";

export function Monograma({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={simboloKls.url}
      alt="KLS"
      className={`${className} object-contain`}
      width="560"
      height="382"
      decoding="async"
    />
  );
}

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const width =
    size === "lg"
      ? "w-72 sm:w-80"
      : size === "sm"
        ? "w-36"
        : "w-48 sm:w-56";

  return (
    <img
      src={logoCompleto.url}
      alt="Karate Legends Sparring · World League"
      className={`${width} h-auto select-none object-contain`}
      width="760"
      height="679"
      decoding="async"
    />
  );
}

/** Marca compacta para cabeçalhos: monograma + nome em uma linha. */
export function MarcaCompacta() {
  return (
    <div className="flex min-w-0 items-center gap-3 select-none">
      <Monograma className="h-9 w-[3.3rem] shrink-0" />
      <div className="min-w-0 leading-none">
        <div className="display text-xs sm:text-sm">Karate Legends Sparring</div>
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
