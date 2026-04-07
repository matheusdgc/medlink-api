/**
 * Script de normalizacao de dados — execucao unica.
 *
 * Problema:
 * Registros gravados antes da normalizacao automatica podem conter
 * variacoes do mesmo farmaco com grafias diferentes:
 *   "Dipirona", "dipirona sodica", "Dipirona Sódica", "DIPIRONA"
 *
 * Este script:
 * 1. Aplica Title Case em todos os ItemReceita (medicamento + principioAtivo)
 * 2. Aplica Title Case em todos os diagnosticos das Receitas
 * 3. Consolida variacoes conhecidas de um mesmo farmaco para o nome canonico
 *
 * COMO EXECUTAR (uma unica vez):
 *   cd medlink-api
 *   npx tsx prisma/normalize-medicamentos.ts
 *
 * O script e seguro para rodar multiplas vezes (idempotente):
 * - Na segunda execucao, nenhum registro sera alterado pois os valores
 *   ja estarao no formato normalizado.
 */

import { PrismaClient } from "@prisma/client";
import { normalizarMedicamento, normalizarDiagnostico } from "../src/utils/normalizar.js";

const prisma = new PrismaClient();

/**
 * Mapa de consolidacoes: variacoes conhecidas -> nome canonico correto.
 *
 * Funciona DEPOIS da normalizacao Title Case, entao as chaves devem
 * estar em Title Case tambem.
 *
 * Por que isso e necessario?
 * A normalizacao Title Case transforma "dipirona sodica" em "Dipirona Sodica"
 * (sem acento). Mas o nome canonico correto e "Dipirona Sódica" (com acento).
 * A funcao normalizarMedicamento preserva acentos que ja existem, mas nao
 * adiciona acentos que estavam faltando — isso e responsabilidade deste mapa.
 *
 * Para adicionar novas consolidacoes no futuro, basta incluir uma nova entrada:
 *   "Nome Errado": "Nome Canonico Correto",
 */
const CONSOLIDACOES: Record<string, string> = {
  // Dipirona: consolidar todas as variacoes para "Dipirona Sódica"
  "Dipirona":            "Dipirona Sódica",
  "Dipirona Sodica":     "Dipirona Sódica",
  "Dipirona Monoidrato": "Dipirona Sódica",

  // Ibuprofeno: nao tem variacao tipica, mas se surgir:
  // "Ibuprofen": "Ibuprofeno",

  // Paracetamol/Acetaminofeno (nomes alternativos no Brasil)
  "Acetaminofeno":       "Paracetamol",
};

/**
 * Aplica primeiro a normalizacao Title Case, depois verifica se o resultado
 * tem uma consolidacao conhecida. Retorna o nome final correto.
 */
function normalizarComConsolidacao(nome: string): string {
  const titleCase = normalizarMedicamento(nome);
  return CONSOLIDACOES[titleCase] ?? titleCase;
}

async function main() {
  console.log("[normalize] Iniciando normalizacao de medicamentos e diagnosticos...");
  console.log("[normalize] Buscando todos os itens de receita...");

  // ======== NORMALIZACAO DE ITENS DE RECEITA ========

  const itens = await prisma.itemReceita.findMany({
    select: { id: true, medicamento: true, principioAtivo: true },
  });

  console.log(`[normalize] ${itens.length} itens encontrados.`);

  let itensAtualizados = 0;

  for (const item of itens) {
    const novoMedicamento = normalizarComConsolidacao(item.medicamento);

    const novoPrincipioAtivo = item.principioAtivo
      ? normalizarComConsolidacao(item.principioAtivo)
      : item.principioAtivo;

    // So atualiza se houver diferenca (evita queries desnecessarias)
    const medicamentoMudou = novoMedicamento !== item.medicamento;
    const principioMudou = novoPrincipioAtivo !== item.principioAtivo;

    if (medicamentoMudou || principioMudou) {
      await prisma.itemReceita.update({
        where: { id: item.id },
        data: {
          ...(medicamentoMudou && { medicamento: novoMedicamento }),
          ...(principioMudou && { principioAtivo: novoPrincipioAtivo }),
        },
      });

      if (medicamentoMudou) {
        console.log(`[normalize] Medicamento: "${item.medicamento}" -> "${novoMedicamento}"`);
      }
      if (principioMudou) {
        console.log(`[normalize] Principio ativo: "${item.principioAtivo}" -> "${novoPrincipioAtivo}"`);
      }

      itensAtualizados++;
    }
  }

  // ======== NORMALIZACAO DE DIAGNOSTICOS ========

  const receitas = await prisma.receita.findMany({
    where: { diagnostico: { not: null } },
    select: { id: true, diagnostico: true },
  });

  console.log(`[normalize] ${receitas.length} receitas com diagnostico encontradas.`);

  let diagnosticosAtualizados = 0;

  for (const receita of receitas) {
    if (!receita.diagnostico) continue;

    const novoDiagnostico = normalizarDiagnostico(receita.diagnostico);

    if (novoDiagnostico !== receita.diagnostico) {
      await prisma.receita.update({
        where: { id: receita.id },
        data: { diagnostico: novoDiagnostico },
      });

      console.log(`[normalize] Diagnostico: "${receita.diagnostico}" -> "${novoDiagnostico}"`);
      diagnosticosAtualizados++;
    }
  }

  // ======== RELATORIO FINAL ========

  console.log("\n[normalize] Normalizacao concluida.");
  console.log(`[normalize] Itens atualizados:       ${itensAtualizados} de ${itens.length}`);
  console.log(`[normalize] Diagnosticos atualizados: ${diagnosticosAtualizados} de ${receitas.length}`);

  if (itensAtualizados === 0 && diagnosticosAtualizados === 0) {
    console.log("[normalize] Nenhuma alteracao necessaria — dados ja estao normalizados.");
  }
}

main()
  .catch((e) => {
    console.error("[normalize] Erro durante a normalizacao:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
