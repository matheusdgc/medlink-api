import prisma from "../../config/database.js";
import { ForbiddenError } from "../../types/index.js";

export class EstatisticasService {
  async visaoGeral() {
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

  async receitasPorMes(meses: number = 6) {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);

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

    return resultado.map((r: Row) => ({ mes: r.mes, total: Number(r.total) }));
  }

  async medicamentosMaisReceitados(limite: number = 10) {
    const resultado = await prisma.itemReceita.groupBy({
      by: ["medicamento"],
      _count: { medicamento: true },
      orderBy: { _count: { medicamento: "desc" } },
      take: limite,
    });

    type ItemMedRow = { medicamento: string; _count: { medicamento: number } };
    return resultado.map((r: ItemMedRow) => ({
      medicamento: r.medicamento,
      total: r._count.medicamento,
    }));
  }

  async receitasPorStatus() {
    const resultado = await prisma.receita.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    type StatusRow = { status: string; _count: { status: number } };
    return resultado.map((r: StatusRow) => ({
      status: String(r.status),
      total: r._count.status,
    }));
  }

  async medicosRanking(limite: number = 10) {
    const medicos = await prisma.medico.findMany({
      include: {
        usuario: { select: { nome: true } },
        _count: { select: { receitas: true } },
      },
      orderBy: { receitas: { _count: "desc" } },
      take: limite,
    });

    return medicos.map((m: (typeof medicos)[number]) => ({
      nome: m.usuario.nome,
      crm: `${m.crm}/${m.ufCrm}`,
      especialidade: m.especialidade ?? "Nao informada",
      total: m._count.receitas,
    }));
  }

  async diagnosticos(filtros: {
    limite?: number;
    busca?: string;
    mes?: number;
    ano?: number;
  }) {
    const { limite = 10, busca, mes, ano } = filtros;

    let dataWhere: any = {};
    if (mes && ano) {
      dataWhere = {
        gte: new Date(ano, mes - 1, 1),
        lte: new Date(ano, mes, 0, 23, 59, 59, 999),
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

    const agrupados = await prisma.receita.groupBy({
      by: ["diagnostico"],
      where,
      _count: { diagnostico: true },
      orderBy: { _count: { diagnostico: "desc" } },
      take: limite,
    });

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
