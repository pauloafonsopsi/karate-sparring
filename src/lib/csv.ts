/** Gera e baixa um CSV compatível com Excel (BOM + ponto e vírgula). */
export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: (string | number)[][]) {
  const escapar = (c: string | number) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [cabecalho, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo.endsWith(".csv") ? nomeArquivo : `${nomeArquivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
