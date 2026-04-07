import prisma from "../../config/database.js";
import { NotFoundError } from "../../types/index.js";
import { StatusReceita } from "@prisma/client";

export class AdminService {
  /**
   * Delecao permanente de receita do banco de dados.
   *
   * Diferenca em relacao ao "cancelar" do medico:
   *   - cancelar: muda status para CANCELADA, o registro continua no banco.
   *   - deletar (admin): remove fisicamente a receita e todos os dados relacionados.
   *
   * Precisa deletar a Dispensacao antes da Receita porque a FK de Dispensacao
   * para Receita nao tem onDelete: Cascade no schema. ItemReceita ja tem
   * onDelete: Cascade, entao e deletado automaticamente junto com a Receita.
   */
  async deletarReceita(id: string) {
    const receita = await prisma.receita.findUnique({
      where: { id },
      include: { dispensacao: true },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    // Remove a dispensacao primeiro para nao violar a FK constraint
    if (receita.dispensacao) {
      await prisma.dispensacao.delete({ where: { receitaId: id } });
    }

    // ItemReceita tem onDelete: Cascade, sera removido automaticamente
    await prisma.receita.delete({ where: { id } });

    return { id, mensagem: "Receita permanentemente removida do sistema" };
  }

  /**
   * Lista todas as receitas do sistema sem filtrar por medico ou paciente.
   * Exclusivo para o admin, que tem visibilidade total.
   */
  async listarTodasReceitas(filters: {
    status?: StatusReceita;
    pacienteNome?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.pacienteNome) {
      where.paciente = {
        usuario: {
          nome: { contains: filters.pacienteNome, mode: "insensitive" },
        },
      };
    }

    const [receitas, total] = await Promise.all([
      prisma.receita.findMany({
        where,
        skip,
        take: limit,
        orderBy: { criadaEm: "desc" },
        include: {
          paciente: {
            include: {
              usuario: { select: { nome: true } },
            },
          },
          medico: {
            include: {
              usuario: { select: { nome: true } },
            },
          },
          itens: true,
          dispensacao: {
            include: {
              farmacia: {
                include: {
                  usuario: { select: { nome: true } },
                },
              },
            },
          },
        },
      }),
      prisma.receita.count({ where }),
    ]);

    return {
      receitas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retorna um resumo de totais para o painel do admin.
   */
  async obterResumo() {
    const [totalReceitas, totalPacientes, totalMedicos, totalFarmacias] =
      await Promise.all([
        prisma.receita.count(),
        prisma.paciente.count(),
        prisma.medico.count(),
        prisma.farmacia.count(),
      ]);

    const receitasPorStatus = await prisma.receita.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const statusMap: Record<string, number> = {};
    for (const g of receitasPorStatus) {
      statusMap[String(g.status)] = g._count.status;
    }

    return {
      totalReceitas,
      totalPacientes,
      totalMedicos,
      totalFarmacias,
      receitasPorStatus: statusMap,
    };
  }
}

export const adminService = new AdminService();
