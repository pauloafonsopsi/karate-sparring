import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Field, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso administrativo · Karate Sparring" },
      { name: "description", content: "Área restrita da equipe Karate Sparring." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso administrativo · Karate Sparring" },
      { property: "og:description", content: "Área restrita da equipe Karate Sparring." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) {
      toast.error("Email ou senha inválidos.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="grain flex min-h-screen items-center">
      <div className="mx-auto w-full max-w-sm px-5 py-16">
        <Wordmark size="sm" />
        <h1 className="mt-10 text-2xl">Painel</h1>
        <p className="mt-2 text-sm text-muted-fg">Acesso restrito à equipe.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void entrar();
          }}
        >
          <Field label="Email">
            <TextInput
              value={email}
              type="email"
              inputMode="email"
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha">
            <TextInput
              value={senha}
              type="password"
              autoComplete="current-password"
              onChange={(e) => setSenha(e.target.value)}
            />
          </Field>
          <Btn full type="submit" disabled={entrando}>
            {entrando ? "Entrando" : "Entrar"}
          </Btn>
        </form>
      </div>
    </main>
  );
}
