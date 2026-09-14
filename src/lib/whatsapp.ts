export function whatsappLink(numero: string | null | undefined, texto?: string) {
  const d = (numero ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const full = d.startsWith("55") ? d : `55${d}`;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${full}${q}`;
}
