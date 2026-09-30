export const DIAS_SEMANA = [
  { valor: 1, nome: "Segunda" },
  { valor: 2, nome: "Terça" },
  { valor: 3, nome: "Quarta" },
  { valor: 4, nome: "Quinta" },
  { valor: 5, nome: "Sexta" },
  { valor: 6, nome: "Sábado" },
  { valor: 7, nome: "Domingo" },
] as const;

export function nomeDia(valor: number | null | undefined) {
  return DIAS_SEMANA.find((d) => d.valor === valor)?.nome ?? "—";
}

export const FUSOS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Boa_Vista",
  "America/Santarem",
  "America/Araguaina",
  "America/Maceio",
  "America/Noronha",
] as const;

/** Próxima segunda-feira (usada como vigência de troca de dojô). */
export function proximaSegunda(base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const delta = (8 - (d.getDay() === 0 ? 7 : d.getDay())) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
