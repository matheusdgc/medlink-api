const MINUSCULAS_COMPOSTAS = new Set([
  "de", "da", "do", "das", "dos",
  "e", "ou",
  "para", "por", "em", "com", "sem",
  "a", "o", "as", "os",
]);

export function normalizarMedicamento(nome: string): string {
  if (!nome) return nome;

  const palavras = nome
    .trim()
    .replace(/\s+/g, " ")
    .split(" ");

  return palavras
    .map((palavra, indice) => {
      const lower = palavra.toLowerCase();

      if (indice === 0) {
        return capitalize(lower);
      }

      if (MINUSCULAS_COMPOSTAS.has(lower)) {
        return lower;
      }

      return capitalize(lower);
    })
    .join(" ");
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function normalizarDiagnostico(diagnostico: string): string {
  return normalizarMedicamento(diagnostico);
}
