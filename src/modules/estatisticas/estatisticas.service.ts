import prisma from "../../config/database.js";
import { ForbiddenError } from "../../types/index.js";

export class EstatisticasService {
  /**
   * Visao geral global do sistema.
   * Retorna totais consolidados para os cards de resumo nos dashboards.
   */
  async visaoGeral() {
    // Promise.all executa todas as queries em paralelo, reduzindo o tempo de resposta
    const [totalReceitas, totalPacientes, totalMedicos, totalDispensacoes, statusGrupos] =
      await Promise.all([
        prisma.receita.count(),
        prisma.paciente.count(),
        prisma.medico.count(),
        prisma.dispensacao.count(),
        prisma.receita.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
      ]);

    // Transforma o array de grupos em um objeto para acesso rapido por chave
    // Anotamos o parametro 'g' explicitamente porque Object.fromEntries tem uma
    // assinatura generica ampla demais para que o TypeScript infira o tipo via contexto
    const statusMap: Record<string, number> = {};
    for (const g of statusGrupos) {
      statusMap[String(g.status)] = g._count.status;
    }

    return {
      totalReceitas,
      totalPacientes,
      totalMedicos,
      totalDispensacoes,
      receitasAtivas: statusMap["ATIVA"] ?? 0,
      receitasDispensadas: statusMap["DISPENSADA"] ?? 0,
      receitasVencidas: statusMap["VENCIDA"] ?? 0,
      receitasCanceladas: statusMap["CANCELADA"] ?? 0,
    };
  }

  /**
   * Receitas agrupadas por mes nos ultimos N meses.
   * Usado para o grafico de linha/area nos dashboards.
   *
   * Usamos $queryRaw aqui porque o Prisma nao suporta DATE_TRUNC
   * diretamente no groupBy. O ::bigint e necessario porque o PostgreSQL
   * retorna COUNT(*) como tipo numeric/bigint, e o JS precisa converter para Number.
   */
  async receitasPorMes(meses: number = 6) {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);

    // Tipo da linha retornada pela query raw
    type Row = { mes: string; total: bigint };

    const resultado = await prisma.$queryRaw<Row[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', criada_em), 'YYYY-MM') AS mes,
        COUNT(*)::bigint AS total
      FROM receitas
      WHERE criada_em >= ${dataLimite}
      GROUP BY DATE_TRUNC('month', criada_em)
      ORDER BY DATE_TRUNC('month', criada_em) ASC
    `;

    // BigInt nao e serializavel para JSON diretamente, por isso convertemos para Number
    // Anotamos "r: Row" explicitamente pois $queryRaw retorna um tipo generico
    // e o TypeScript nao propaga o generic para o callback do .map()
    return resultado.map((r: Row) => ({ mes: r.mes, total: Number(r.total) }));
  }

  /**
   * Top N medicamentos mais receitados globalmente.
   * Agrupa a tabela itens_receita pelo campo medicamento e conta ocorrencias.
   */
  async medicamentosMaisReceitados(limite: number = 10) {
    const resultado = await prisma.itemReceita.groupBy({
      by: ["medicamento"],
      _count: { medicamento: true },
      orderBy: { _count: { medicamento: "desc" } },
      take: limite,
    });

    // Tipo explicito do resultado do groupBy por medicamento
    type ItemMedRow = { medicamento: string; _count: { medicamento: number } };
    return resultado.map((r: ItemMedRow) => ({
      medicamento: r.medicamento,
      total: r._count.medicamento,
    }));
  }

  /**
   * Distribuicao de receitas por status.
   * Usado no grafico de pizza/donut nos dashboards.
   */
  async receitasPorStatus() {
    const resultado = await prisma.receita.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Tipo explicito do resultado do groupBy por status
    type StatusRow = { status: string; _count: { status: number } };
    return resultado.map((r: StatusRow) => ({
      status: String(r.status),
      total: r._count.status,
    }));
  }

  /**
   * Ranking dos medicos com mais receitas criadas.
   * Util para gestores e para mostrar atividade do sistema.
   */
  async medicosRanking(limite: number = 10) {
    const medicos = await prisma.medico.findMany({
      include: {
        usuario: { select: { nome: true } },
        _count: { select: { receitas: true } },
      },
      orderBy: { receitas: { _count: "desc" } },
      take: limite,
    });

    // "(typeof medicos)[number]" e um utilitario TypeScript que extrai o tipo
    // do elemento de um array inferido pelo Prisma, sem precisar redeclara-lo manualmente
    return medicos.map((m: (typeof medicos)[number]) => ({
      nome: m.usuario.nome,
      crm: `${m.crm}/${m.ufCrm}`,
      especialidade: m.especialidade ?? "Nao informada",
      total: m._count.receitas,
    }));
  }

  /**
   * Top diagnosticos mais frequentes, com filtro por periodo e busca por texto.
   * Tambem retorna quantos PACIENTES UNICOS aparecem com aquele diagnostico,
   * o que responde perguntas como "quantos pacientes com diabetes em Abril".
   */
  async diagnosticos(filtros: {
    limite?: number;
    busca?: string;
    mes?: number;
    ano?: number;
  }) {
    const { limite = 10, busca, mes, ano } = filtros;

    // Monta o filtro de data dinamicamente
    let dataWhere: any = {};
    if (mes && ano) {
      dataWhere = {
        gte: new Date(ano, mes - 1, 1),
        lte: new Date(ano, mes, 0, 23, 59, 59, 999), // ultimo dia do mes
      };
    } else if (ano) {
      dataWhere = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59, 999),
      };
    }

    const where: any = { diagnostico: { not: null } };
    if (busca) where.diagnostico = { contains: busca, mode: "insensitive" };
    if (Object.keys(dataWhere).length > 0) where.criadaEm = dataWhere;

    // Primeiro, agrupa para obter os diagnosticos mais frequentes
    const agrupados = await prisma.receita.groupBy({
      by: ["diagnostico"],
      where,
      _count: { diagnostico: true },
      orderBy: { _count: { diagnostico: "desc" } },
      take: limite,
    });

    // Para cada diagnostico, conta pacientes unicos com uma segunda query
    // Tipo do elemento do groupBy por diagnostico
    type DiagnosticoRow = { diagnostico: string | null; _count: { diagnostico: number } };
    const resultados = await Promise.all(
      agrupados.map(async (g: DiagnosticoRow) => {
        const pacientesUnicos = await prisma.receita.groupBy({
          by: ["pacienteId"],
          where: { ...where, diagnostico: g.diagnostico },
        });

        return {
          diagnostico: g.diagnostico!,
          totalReceitas: g._count.diagnostico,
          pacientesUnicos: pacientesUnicos.length,
        };
      })
    );

    return resultados;
  }

  /**
   * Estatisticas pessoais do medico logado.
   * Combina dados proprios (receitas que ele criou) com rankings dos seus medicamentos.
   * Endpoint exclusivo para o tipo MEDICO.
   */
  async minhasEstatisticas(medicoUserId: string) {
    const medico = await prisma.medico.findUnique({
      where: { usuarioId: medicoUserId },
    });
    if (!medico) throw new ForbiddenError("Medico nao encontrado");

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const dataLimite6Meses = new Date();
    dataLimite6Meses.setMonth(dataLimite6Meses.getMonth() - 6);

    const [totalReceitas, receitasMes, statusGrupos, pacientesGrupos, medicamentosTop] =
      await Promise.all([
        prisma.receita.count({ where: { medicoId: medico.id } }),
        prisma.receita.count({
          where: { medicoId: medico.id, criadaEm: { gte: inicioMes } },
        }),
        prisma.receita.groupBy({
          by: ["status"],
          where: { medicoId: medico.id },
          _count: { status: true },
        }),
        // groupBy pacienteId retorna uma linha por paciente unico
        prisma.receita.groupBy({
          by: ["pacienteId"],
          where: { medicoId: medico.id },
        }),
        prisma.itemReceita.groupBy({
          by: ["medicamento"],
          where: { receita: { medicoId: medico.id } },
          _count: { medicamento: true },
          orderBy: { _count: { medicamento: "desc" } },
          take: 5,
        }),
      ]);

    type Row = { mes: string; total: bigint };
    const receitasPorMes = await prisma.$queryRaw<Row[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', criada_em), 'YYYY-MM') AS mes,
        COUNT(*)::bigint AS total
      FROM receitas
      WHERE medico_id = ${medico.id}
        AND criada_em >= ${dataLimite6Meses}
      GROUP BY DATE_TRUNC('month', criada_em)
      ORDER BY DATE_TRUNC('month', criada_em) ASC
    `;

    const statusMap: Record<string, number> = {};
    for (const g of statusGrupos) {
      statusMap[String(g.status)] = g._count.status;
    }

    return {
      totalReceitas,
      receitasMes,
      pacientesAtendidos: pacientesGrupos.length,
      receitasAtivas: statusMap["ATIVA"] ?? 0,
      receitasDispensadas: statusMap["DISPENSADA"] ?? 0,
      medicamentosTop: medicamentosTop.map((m: (typeof medicamentosTop)[number]) => ({
        medicamento: m.medicamento,
        total: m._count.medicamento,
      })),
      receitasPorMes: receitasPorMes.map((r: Row) => ({
        mes: r.mes,
        total: Number(r.total),
      })),
    };
  }
}

export const estatisticasService = new EstatisticasService();
