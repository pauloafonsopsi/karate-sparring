import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota antiga da área do sensei: agora a gestão acontece em /clube. */
export const Route = createFileRoute("/_authenticated/admin_/dojos")({
  beforeLoad: () => {
    throw redirect({ to: "/clube", replace: true });
  },
  component: () => null,
});
