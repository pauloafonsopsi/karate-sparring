import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Badge, Btn } from "@/components/kit";
import { TrocaArea } from "@/components/troca-area";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";
import { cancelarMeuPedido, getMinhaConta } from "@/lib/atleta.functions";
import { nomeDia } from "@/lib/semana";

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

const TEXTO_FILIACAO: Record<string, string> = {
  aguardando: "Sua filiação será liberada depois da autorização do clube.",
  ativa: "Filiação ativa. Você já conta para o ranking do seu clube.",
  pausada: "Sua filiação está pausada. Fale com seu sensei ou com a liga.",
  cancelada: "Sua filiação foi cancelada.",
};

function AreaAtleta() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contaFn = useServerFn(getMinhaConta);
  const cancelarFn = useServerFn(cancelarMeuPedido);

  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });
  const { data: conta, isLoading } = useQuery({
    queryKey: ["minha-conta"],
    queryFn: () => contaFn({}),
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarFn({}),
    onSuccess: () => {
      toast.success("Pedido cancelado. Você pode pedir entrada em outro clube.");
      void qc.invalidateQueries({ queryKey: ["minha-conta"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos cancelar agora."),
  });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const autorizacao = conta?.vinculo?.status_autorizacao ?? null;
  const filiacao = conta?.filiacao?.status ?? "aguardando";
  const wa = conta?.clube ? conta.clube.whatsapp_responsavel.replace(/\D/g, "") : "";

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
              {conta.faixa && <p className="mt-1 text-sm text-brand">{conta.faixa}</p>}
            </section>

            {autorizacao === "pendente" && (
              <section className="mt-8 border border-line bg-surface p-6">
                <p className="eyebrow text-brand">Aguardando autorização</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                  Seu pedido foi enviado para{" "}
                  {conta.clube?.responsavel ?? "o responsável pelo clube"}
                  {conta.clube ? ` (${conta.clube.nome})` : ""}. Assim que ele autorizar, seu
                  passaporte e o ranking são liberados.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {wa && (
                    <a
                      href={`https://wa.me/55${wa}`}
                      target="_blank"
                      rel="noopener"
                      className="eyebrow border border-line px-4 py-3 hover:border-foreground/40"
                    >
                      Falar com o sensei
                    </a>
                  )}
                  <Btn
                    variant="ghost"
                    className="px-0"
                    disabled={cancelar.isPending}
                    onClick={() => cancelar.mutate()}
                  >
                    Cancelar e escolher outro clube
                  </Btn>
                </div>
              </section>
            )}

            {autorizacao === "autorizado" && (
              <section className="mt-8 border border-line bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="eyebrow">Passaporte do atleta</p>
                  <Badge tone={filiacao === "ativa" ? "ativo" : "muted"}>{filiacao}</Badge>
                </div>
                <p className="display mt-3 text-lg">{conta.clube?.nome}</p>
                <p className="mt-1 text-sm text-muted-fg">
                  {conta.clube?.responsavel} · {conta.clube?.cidade}/{conta.clube?.uf}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-fg">
                  {conta.clube?.piloto && filiacao === "ativa"
                    ? "Sua filiação à liga é cortesia no período piloto."
                    : (TEXTO_FILIACAO[filiacao] ?? TEXTO_FILIACAO["aguardando"])}
                </p>
              </section>
            )}

            {(!autorizacao || autorizacao === "recusado") && (
              <section className="mt-8 border border-line bg-surface p-6">
                <p className="eyebrow">Sem clube</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                  {autorizacao === "recusado"
                    ? `Seu pedido não foi aceito pelo clube.${conta.vinculo?.recusa_motivo ? ` Motivo: ${conta.vinculo.recusa_motivo}.` : ""} Você pode pedir entrada em outro clube.`
                    : "Você ainda não pediu entrada em um clube licenciado."}
                </p>
                <Link
                  to="/"
                  className="eyebrow mt-4 inline-block border border-line px-4 py-3 hover:border-foreground/40"
                >
                  Ver clubes licenciados
                </Link>
              </section>
            )}

            {conta.unidade && autorizacao === "autorizado" && (
              <section className="mt-4 border border-line bg-surface p-6">
                <p className="eyebrow">Meu treino semanal</p>
                <p className="display mt-3 text-lg">
                  {conta.unidade.dia_aula
                    ? `${nomeDia(conta.unidade.dia_aula)} às ${(conta.unidade.horario_aula ?? "").slice(0, 5)}`
                    : "Dia a confirmar com o clube"}
                </p>
                <p className="mt-1 text-sm text-muted-fg">
                  {conta.unidade.duracao_minutos} minutos · {conta.unidade.nome}
                </p>
                {conta.unidade.endereco && (
                  <p className="mt-3 text-sm text-muted-fg">{conta.unidade.endereco}</p>
                )}
              </section>
            )}

            <section className="mt-4 border border-line bg-surface p-6">
              <p className="eyebrow">Em breve</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-fg">
                Presença no treino, ranking e convocação para o Legends Camp entram nas próximas
                etapas. Para trocar de clube depois de autorizado, fale com a liga.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
