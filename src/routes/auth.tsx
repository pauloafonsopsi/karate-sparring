import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Field, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar · Karate Legends Sparring" },
      { name: "description", content: "Acesse sua conta na World League." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Entrar · Karate Legends Sparring" },
      { property: "og:description", content: "Acesse sua conta na World League." },
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setEntrando(false);
    if (error) {
      toast.error("Email ou senha inválidos.");
      return;
    }
    try {
      const acesso = await getMeuAcesso();
      navigate({ to: acesso.area, replace: true });
    } catch {
      navigate({ to: "/atleta", replace: true });
    }
  }

  return (
    <main className="grain flex min-h-screen items-center">
      <div className="mx-auto w-full max-w-sm px-5 py-16">
        <Wordmark size="sm" />
        <h1 className="mt-10 text-2xl">Entrar</h1>
        <p className="mt-2 text-sm text-muted-fg">Atleta, sensei ou equipe da liga.</p>
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
        <p className="mt-6 text-sm text-muted-fg">
          Ainda não tem conta?{" "}
          <Link to="/" className="text-foreground underline">
            Cadastre-se pelo seu dojô
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
