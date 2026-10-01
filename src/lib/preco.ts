/** Formata centavos como moeda brasileira. */
export function brl(centavos: number | null | undefined) {
  if (centavos == null) return "—";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Valor da filiação à liga quando o clube não está no piloto. */
export const FILIACAO_LIGA_PADRAO_CENTAVOS = 1990;
