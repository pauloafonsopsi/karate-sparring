import logoAsset from "@/assets/karate-sparring-logo.png.asset.json";

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "w-full max-w-[42rem]"
      : size === "sm"
        ? "w-44 sm:w-52"
        : "w-64 sm:w-80";
  return (
    <img
      src={logoAsset.url}
      alt="Karate Sparring by Legends"
      className={`block h-auto ${cls}`}
      decoding="async"
    />
  );
}

export function Rule() {
  return <div className="h-px w-full bg-line" />;
}
