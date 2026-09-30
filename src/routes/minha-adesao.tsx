import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/minha-adesao")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
