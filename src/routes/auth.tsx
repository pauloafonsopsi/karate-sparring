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
  const [enviando, setEnviando] = useState(false);

  async function recuperar() {
    const alvo = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(alvo)) {
      toast.error("Digite seu email no campo acima.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setEnviando(false);
    if (error && error.status === 429) {
      toast.error("Muitos pedidos agora. Tente de novo em uma hora.");
      return;
    }
    toast.success("Se esse email estiver cadastrado, você receberá um link para criar nova senha.");
  }

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
        <button
          type="button"
          className="mt-4 text-sm text-muted-fg underline hover:text-foreground"
          onClick={() => void recuperar()}
          disabled={enviando}
        >
          {enviando ? "Enviando" : "Esqueci minha senha"}
        </button>
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
