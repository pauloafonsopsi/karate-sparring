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

export function Rule() {
  return <div className="h-px w-full bg-line" />;
}
