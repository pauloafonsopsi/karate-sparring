import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Wordmark } from "@/components/brand";
import { Badge, Btn, SelectInput, TextInput } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { getMeuAcesso } from "@/lib/acesso.functions";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin_/dojos")({
  head: () => ({
    meta: [
      { title: "Meu dojô · Karate Sparring" },
      { name: "description", content: "Leads de sparring da sua região." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu dojô · Karate Sparring" },
      { property: "og:description", content: "Leads de sparring da sua região." },
    ],
  }),
  component: Dojos,
});

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string | null;
  uf: string;
  produto_escolhido: string | null;
  status: string;
  created_at: string | null;
};

function dataBr(v: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

function Dojos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");

  const { data: acesso } = useQuery({ queryKey: ["meu-acesso"], queryFn: () => getMeuAcesso() });

  const { data: sensei } = useQuery({
    queryKey: ["meu-sensei"],
    enabled: !!acesso?.sensei_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senseis")
        .select("id, nome, dojo, cidade, uf, status")
        .eq("id", acesso!.sensei_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads-do-dojo"],
    enabled: !!acesso?.sensei_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_atletas")
        .select("id, nome, whatsapp, email, cidade, uf, produto_escolhido, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const { data: pagamentos } = useQuery({
    queryKey: ["pagamentos-do-dojo"],
    enabled: !!acesso?.sensei_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("lead_id, status, valor_sensei, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pagamentoDoLead = (leadId: string) =>
    (pagamentos ?? []).find((p) => p.lead_id === leadId) ?? null;

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const termo = busca.trim().toLowerCase();
  const lista = (leads ?? []).filter(
    (l) =>
      (!status || l.status === status) &&
      (!termo || [l.nome, l.email, l.cidade ?? ""].some((f) => f.toLowerCase().includes(termo))),
  );

  const total = (leads ?? []).length;
  const convertidos = (leads ?? []).filter((l) => l.status === "convertido").length;

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            {acesso?.admin && (
              <Btn variant="ghost" className="px-0" onClick={() => navigate({ to: "/admin" })}>
                Painel
              </Btn>
            )}
            <Btn variant="ghost" className="px-0" onClick={() => void sair()}>
              Sair
            </Btn>
          </div>
        </header>

        {!acesso?.sensei_id ? (
          <p className="mt-10 border border-line bg-surface p-6 text-sm text-muted-fg">
            Sua conta ainda não está vinculada a um dojô. Fale com a equipe Karate Sparring.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <h1 className="text-2xl">{sensei?.dojo ?? "Meu dojô"}</h1>
              <p className="mt-2 text-sm text-muted-fg">
                {sensei?.nome} · {sensei?.cidade}/{sensei?.uf}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-line bg-surface p-4">
                  <div className="fight-number text-3xl">{total}</div>
                  <div className="eyebrow mt-1">Leads da sua região</div>
                </div>
                <div className="border border-line bg-surface p-4">
                  <div className="fight-number text-3xl text-brand">{convertidos}</div>
                  <div className="eyebrow mt-1">Pagantes confirmados</div>
                </div>
              </div>
            </section>

            <div className="mt-8 mb-4 flex flex-wrap gap-3">
              <SelectInput
                className="max-w-44"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                {["lead", "convertido", "orfao_conciliado"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                className="max-w-64"
                placeholder="Buscar nome, email ou cidade"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {lista.map((l) => {
                const wa = whatsappLink(
                  l.whatsapp,
                  `Olá ${l.nome.split(" ")[0]}, aqui é do ${sensei?.dojo ?? "dojô"}. Vamos falar sobre o sparring de sábado?`,
                );
                return (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-start justify-between gap-4 border border-line bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">{l.nome}</div>
                      <div className="mt-1 text-xs text-muted-fg">
                        {l.whatsapp} · {l.email}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                        <Badge tone={l.status}>{l.status}</Badge>
                        <span>{l.produto_escolhido ?? "sem produto"}</span>
                        <span>
                          {l.cidade ?? "—"}/{l.uf}
                        </span>
                        <span>{dataBr(l.created_at)}</span>
                      </div>
                    </div>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <Btn variant="outline">WhatsApp</Btn>
                      </a>
                    )}
                  </div>
                );
              })}
              {lista.length === 0 && (
                <p className="border border-line bg-surface p-6 text-sm text-muted-fg">
                  Nenhum lead por aqui ainda.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
