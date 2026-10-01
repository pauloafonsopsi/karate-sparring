import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, TextInput } from "@/components/kit";
import { definirPapelAdmin, listarUsuariosAdmin } from "@/lib/admin.functions";
import { baixarCsv } from "@/lib/csv";

const PAPEIS = ["admin", "sensei", "atleta"] as const;

function dataHoraBr(v: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR") : "nunca entrou";
}

export function AbaAcessos() {
  const qc = useQueryClient();
  const definirFn = useServerFn(definirPapelAdmin);
  const [busca, setBusca] = useState("");

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => listarUsuariosAdmin(),
  });

  const definir = useMutation({
    mutationFn: (v: { user_id: string; role: (typeof PAPEIS)[number]; conceder: boolean }) =>
      definirFn({ data: v }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      await qc.invalidateQueries({ queryKey: ["meu-acesso"] });
      toast.success("Acesso atualizado.");
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos mudar o acesso."),
  });

  const termo = busca.trim().toLowerCase();
  const lista = (usuarios ?? []).filter((u) => !termo || u.email.toLowerCase().includes(termo));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <TextInput
          className="max-w-64"
          placeholder="Buscar email"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Btn
          variant="outline"
          onClick={() =>
            baixarCsv(
              "acessos-karate-legends",
              ["email", "papeis", "clube", "ultimo_acesso"],
              lista.map((u) => [u.email, u.papeis.join(" + "), u.clube ?? "", dataHoraBr(u.ultimo_acesso)]),
            )
          }
        >
          Exportar CSV
        </Btn>
      </div>

      <p className="mb-3 text-sm text-muted-fg">
        {isLoading ? "Carregando" : `${lista.length} conta(s)`}
      </p>

      <div className="divide-y divide-line border border-line">
        {lista.map((u) => (
          <div key={u.user_id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold">{u.email}</p>
              <p className="text-sm text-muted-fg">
                {u.clube ? `${u.clube} · ` : ""}
                último acesso: {dataHoraBr(u.ultimo_acesso)}
              </p>
              <div className="mt-2 flex gap-2">
                {u.papeis.length === 0 ? (
                  <Badge>sem papel</Badge>
                ) : (
                  u.papeis.map((p) => (
                    <Badge key={p} tone={p === "admin" ? "ativo" : "muted"}>
                      {p}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PAPEIS.map((p) => {
                const tem = u.papeis.includes(p);
                return (
                  <Btn
                    key={p}
                    variant={tem ? "primary" : "outline"}
                    disabled={definir.isPending}
                    onClick={() => definir.mutate({ user_id: u.user_id, role: p, conceder: !tem })}
                  >
                    {tem ? `Tirar ${p}` : `Dar ${p}`}
                  </Btn>
                );
              })}
            </div>
          </div>
        ))}
        {!isLoading && lista.length === 0 && (
          <p className="p-6 text-center text-muted-fg">Nenhuma conta encontrada.</p>
        )}
      </div>
    </div>
  );
}
