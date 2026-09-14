export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-[13vw] sm:text-6xl"
      : size === "sm"
        ? "text-lg"
        : "text-3xl sm:text-4xl";
  return (
    <div className="inline-block">
      <div className={`display ${cls} text-foreground`}>Karate Sparring</div>
      <div className="text-right text-[0.7em] font-normal tracking-[0.18em] text-muted-fg uppercase">
        <span className="text-[0.55em] sm:text-[0.5em]">by Legends</span>
      </div>
    </div>
  );
}

export function Rule() {
  return <div className="h-px w-full bg-line" />;
}
