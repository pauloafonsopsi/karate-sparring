import { Link } from "@tanstack/react-router";

import type { MeuAcesso } from "@/lib/acesso.functions";

/** Seletor de área para quem tem mais de um papel. */
export function TrocaArea({ acesso, atual }: { acesso: MeuAcesso | undefined; atual: string }) {
  if (!acesso) return null;

  const areas: { to: "/admin" | "/clube" | "/atleta"; label: string }[] = [];
  if (acesso.admin) areas.push({ to: "/admin", label: "Painel" });
  if (acesso.sensei || acesso.admin) areas.push({ to: "/clube", label: "Meu clube" });
  if (acesso.atleta) areas.push({ to: "/atleta", label: "Sou atleta" });

  const outras = areas.filter((a) => a.to !== atual);
  if (outras.length === 0) return null;

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {outras.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="eyebrow border border-line px-3 py-2 hover:border-foreground/40"
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
