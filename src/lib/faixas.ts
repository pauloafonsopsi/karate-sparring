export const FAIXAS = [
  "Branca",
  "Amarela",
  "Vermelha",
  "Laranja",
  "Verde",
  "Roxa",
  "Marrom",
  "Preta 1º Dan",
  "Preta 2º Dan",
  "Preta 3º Dan",
  "Preta 4º Dan",
  "Preta 5º Dan ou acima",
] as const;

export type Faixa = (typeof FAIXAS)[number];
