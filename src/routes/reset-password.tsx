import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Btn, Field, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha · Karate Legends Sparring" },
      { name: "description", content: "Crie uma nova senha para sua conta." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Nova senha · Karate Legends Sparring" },
      { property: "og:description", content: "Crie uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY" || sessao) setPronto(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setPronto(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function salvar() {
    if (senha.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres.");
    if (senha !== senha2) return toast.error("As senhas não conferem.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return toast.error("Não conseguimos salvar. Peça um novo link.");
    toast.success("Senha atualizada.");
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="grain flex min-h-screen items-center">
      <div className="mx-auto w-full max-w-sm px-5 py-16">
        <Wordmark size="sm" />
        <h1 className="mt-10 text-2xl">Nova senha</h1>
        {!pronto ? (
          <p className="mt-4 text-sm text-muted-fg">
            Validando seu link. Se nada acontecer, peça um novo em "Esqueci minha senha".
          </p>
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void salvar();
            }}
          >
            <Field label="Nova senha">
              <TextInput type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </Field>
            <Field label="Repita a senha">
              <TextInput type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} />
            </Field>
            <Btn full type="submit" disabled={salvando}>
              {salvando ? "Salvando" : "Salvar senha"}
            </Btn>
          </form>
        )}
      </div>
    </main>
  );
}
