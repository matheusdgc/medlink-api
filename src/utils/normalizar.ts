/**
 * Utilitarios de normalizacao de dados textuais do MedLink.
 *
 * Problema resolvido:
 * O campo "medicamento" em ItemReceita e texto livre digitado pelo medico.
 * Sem normalizacao, o mesmo farmaco aparece com grafias diferentes:
 *   "Dipirona", "dipirona sodica", "Dipirona Sódica"
 * O Prisma groupBy compara strings por igualdade exata, entao essas tres
 * entradas viram tres linhas distintas no ranking de medicamentos.
 *
 * Solucao: normalizar para Title Case (primeira letra de cada palavra
 * maiuscula, restante minusculo) no momento da gravacao no banco.
 */

/**
 * Preposicoes e artigos do portugues que devem permanecer em minusculo
 * quando aparecem no MEIO de um nome composto (nao no inicio).
 *
 * Exemplos corretos:
 *   "Acido Acetico de Calcio"  (nao "De")
 *   "Tartarato de Metoprolol"  (nao "De")
 *   "Captopril de Sodio"       (nao "De")
 */
const MINUSCULAS_COMPOSTAS = new Set([
  "de", "da", "do", "das", "dos",
  "e", "ou",
  "para", "por", "em", "com", "sem",
  "a", "o", "as", "os",
]);

/**
 * Converte um nome de medicamento para Title Case padronizado.
 *
 * Regras aplicadas:
 * 1. Trim: remove espacos extras nas extremidades
 * 2. Colapso de espacos multiplos internos em um unico espaco
 * 3. Cada palavra tem a primeira letra maiuscula e o restante minusculo
 * 4. Excecao: preposicoes/artigos no meio do nome ficam em minusculo
 *    (a primeira palavra SEMPRE fica em maiusculo)
 *
 * @example
 * normalizarMedicamento("dipirona sodica")   // "Dipirona Sodica"
 * normalizarMedicamento("IBUPROFENO")        // "Ibuprofeno"
 * normalizarMedicamento("Dipirona Sódica")   // "Dipirona Sódica"  (ja correto)
 * normalizarMedicamento("acido acetico de calcio") // "Acido Acetico de Calcio"
 */
export function normalizarMedicamento(nome: string): string {
  if (!nome) return nome;

  const palavras = nome
    .trim()
    .replace(/\s+/g, " ")  // colapsa espacos multiplos
    .split(" ");

  return palavras
    .map((palavra, indice) => {
      const lower = palavra.toLowerCase();

      // Primeira palavra e numeros/siglas curtas sempre em maiusculo
      if (indice === 0) {
        return capitalize(lower);
      }

      // Preposicoes e artigos no meio permanecem em minusculo
      if (MINUSCULAS_COMPOSTAS.has(lower)) {
        return lower;
      }

      return capitalize(lower);
    })
    .join(" ");
}

/**
 * Coloca a primeira letra em maiusculo preservando os demais caracteres.
 * Funciona corretamente com caracteres acentuados (utf-8).
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Normaliza o campo diagnostico da receita com a mesma logica.
 * Diagnósticos seguem o mesmo padrao textual dos medicamentos.
 *
 * @example
 * normalizarDiagnostico("amigdalite bacteriana") // "Amigdalite Bacteriana"
 * normalizarDiagnostico("DOR DE CABECA")         // "Dor de Cabeca"
 */
export function normalizarDiagnostico(diagnostico: string): string {
  return normalizarMedicamento(diagnostico); // mesma logica
}
