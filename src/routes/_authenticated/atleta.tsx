import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Wordmark } from "@/components/brand";
import { Badge, Btn } from "@/components/kit";
import { TrocaArea } from "@/components/troca-area";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";
import { getMinhaConta } from "@/lib/atleta.functions";

export const Route = createFileRoute("/_authenticated/atleta")({
  head: () => ({
    meta: [
      { title: "Minha conta · Karate Legends Sparring" },
      { name: "description", content: "Sua conta de atleta na World League." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Minha conta · Karate Legends Sparring" },
      { property: "og:description", content: "Sua conta de atleta na World League." },
    ],
  }),
  component: AreaAtleta,
});

const TEXTO_STATUS: Record<string, string> = {
  aguardando: "Sua filiação está aguardando liberação da liga.",
  ativa: "Filiação ativa. Você já conta para o ranking do seu dojô.",
  pausada: "Sua filiação está pausada. Fale com seu sensei ou com a liga.",
  cancelada: "Sua filiação foi cancelada.",
};

function AreaAtleta() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contaFn = useServerFn(getMinhaConta);

  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });
  const { data: conta, isLoading } = useQuery({
    queryKey: ["minha-conta"],
    queryFn: () => contaFn({}),
  });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const status = conta?.filiacao?.status ?? "aguardando";

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            <TrocaArea acesso={acesso} atual="/atleta" />
            <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
              Sair
            </Btn>
          </div>
        </header>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-fg">Carregando…</p>
        ) : !conta ? (
          <p className="mt-10 border border-line bg-surface p-6 text-sm text-muted-fg">
            Esta conta não é de atleta. Use o seletor acima para ir à sua área.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <h1 className="text-2xl">{conta.nome}</h1>
              <p className="mt-2 text-sm text-muted-fg">
                {conta.whatsapp} · {conta.email}
              </p>
            </section>

            <section className="mt-8 border border-line bg-surface p-6">
              <p className="eyebrow">Meu dojô</p>
              {conta.dojo ? (
                <>
                  <p className="display mt-2 text-lg">{conta.dojo.nome}</p>
                  <p className="mt-1 text-sm text-muted-fg">
                    {conta.dojo.sensei} · {conta.dojo.cidade}/{conta.dojo.uf}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-fg">Ainda sem dojô vinculado.</p>
              )}
            </section>

            <section className="mt-4 border border-line bg-surface p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="eyebrow">Filiação</p>
                <Badge tone={status === "ativa" ? "ativo" : "muted"}>{status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                {TEXTO_STATUS[status] ?? TEXTO_STATUS["aguardando"]}
              </p>
            </section>

            <section className="mt-4 border border-line bg-surface p-6">
              <p className="eyebrow">Em breve</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                Presença no treino, ranking e convocação para o Legends Camp entram nas próximas
                etapas. Para trocar de dojô agora, fale com a liga.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
