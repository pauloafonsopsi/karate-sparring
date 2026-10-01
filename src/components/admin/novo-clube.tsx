import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Check, Field, SelectInput, TextInput } from "@/components/kit";
import { criarClubeAdmin } from "@/lib/admin.functions";
import { UFS } from "@/lib/ufs";

function paraCentavos(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function NovoClube({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarClubeAdmin);

  const [f, setF] = useState({
    dojo: "",
    nome: "",
    email: "",
    whatsapp: "",
    cidade: "",
    uf: "",
    graduacao: "",
    mensalidade: "",
    piloto: false,
  });

  const criar = useMutation({
    mutationFn: () => {
      const centavos = f.mensalidade.trim() ? paraCentavos(f.mensalidade) : null;
      if (centavos !== null && !Number.isFinite(centavos)) {
        throw new Error("Mensalidade inválida.");
      }
      return criarFn({
        data: {
          dojo: f.dojo.trim(),
          nome: f.nome.trim(),
          email: f.email.trim(),
          whatsapp: f.whatsapp.trim(),
          cidade: f.cidade.trim(),
          uf: f.uf,
          graduacao: f.graduacao.trim() || null,
          mensalidade_centavos: centavos,
          piloto: f.piloto,
        },
      });
    },
    onSuccess: async (r: { slug: string }) => {
      await qc.invalidateQueries({ queryKey: ["admin-senseis"] });
      toast.success(`Clube criado com o endereço /c/${r.slug}.`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos criar o clube."),
  });

  const faltando =
    f.dojo.trim().length < 2 ||
    f.nome.trim().length < 3 ||
    !f.email.includes("@") ||
    f.whatsapp.trim().length < 10 ||
    f.cidade.trim().length < 2 ||
    !f.uf;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80">
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl">Novo clube</h2>
          <Btn variant="ghost" className="px-0" onClick={onClose}>
            Fechar
          </Btn>
        </div>

        <p className="mt-2 text-sm text-muted-fg">
          O clube nasce aprovado e com a sede criada automaticamente. O convite de acesso é enviado
          depois, pela ficha do clube.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Nome do dojô">
            <TextInput value={f.dojo} onChange={(e) => setF({ ...f, dojo: e.target.value })} />
          </Field>
          <Field label="Sensei responsável">
            <TextInput value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </Field>
          <Field label="Email do responsável" hint="É por este email que ele entra no sistema.">
            <TextInput
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp">
            <TextInput
              value={f.whatsapp}
              onChange={(e) => setF({ ...f, whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Cidade">
            <TextInput value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
          </Field>
          <Field label="UF">
            <SelectInput value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value })}>
              <option value="">Selecione</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Graduação (opcional)">
            <TextInput
              value={f.graduacao}
              onChange={(e) => setF({ ...f, graduacao: e.target.value })}
            />
          </Field>
          <Field label="Mensalidade do clube (R$, opcional)">
            <TextInput
              inputMode="decimal"
              placeholder="120,00"
              value={f.mensalidade}
              onChange={(e) => setF({ ...f, mensalidade: e.target.value })}
            />
          </Field>
          <Check checked={f.piloto} onChange={(v) => setF({ ...f, piloto: v })}>
            Clube do piloto: publica o link sem conta de recebimento e fica isento da anuidade.
          </Check>
          <Btn full disabled={faltando || criar.isPending} onClick={() => criar.mutate()}>
            {criar.isPending ? "Criando" : "Criar clube"}
          </Btn>
        </div>
      </aside>
    </div>
  );
}
