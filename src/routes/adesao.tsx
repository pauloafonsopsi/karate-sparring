import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/adesao")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
