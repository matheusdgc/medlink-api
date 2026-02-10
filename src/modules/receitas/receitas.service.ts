import { TipoUsuario, StatusReceita } from "@prisma/client";
import prisma from "../../config/database.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../types/index.js";

interface CriarReceitaInput {
  pacienteId: string;
  validadeAte: string;
  observacoes?: string;
  diagnostico?: string;
  itens: {
    medicamento: string;
    principioAtivo?: string;
    dosagem: string;
    formaFarmaceutica?: string;
    quantidade: number;
    posologia: string;
    observacao?: string;
  }[];
}

interface AtualizarReceitaInput {
  validadeAte?: string;
  observacoes?: string;
  diagnostico?: string;
  status?: StatusReceita;
}

export class ReceitasService {
  async criar(medicoUserId: string, data: CriarReceitaInput) {
    const medico = await prisma.medico.findUnique({
      where: { usuarioId: medicoUserId },
    });

    if (!medico) {
      throw new ForbiddenError("Apenas médicos podem criar receitas");
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id: data.pacienteId },
    });

    if (!paciente) {
      throw new NotFoundError("Paciente não encontrado");
    }

    if (!data.itens || data.itens.length === 0) {
      throw new ValidationError("A receita deve ter pelo menos um medicamento");
    }

    const receita = await prisma.receita.create({
      data: {
        pacienteId: data.pacienteId,
        medicoId: medico.id,
        validadeAte: new Date(data.validadeAte),
        observacoes: data.observacoes,
        diagnostico: data.diagnostico,
        itens: {
          create: data.itens.map((item) => ({
            medicamento: item.medicamento,
            principioAtivo: item.principioAtivo,
            dosagem: item.dosagem,
            formaFarmaceutica: item.formaFarmaceutica,
            quantidade: item.quantidade,
            posologia: item.posologia,
            observacao: item.observacao,
          })),
        },
      },
      include: {
        itens: true,
        paciente: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
        medico: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
      },
    });

    return receita;
  }

  async listar(
    userId: string,
    userType: TipoUsuario,
    filters: {
      status?: StatusReceita;
      pacienteId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (userType === TipoUsuario.PACIENTE) {
      const paciente = await prisma.paciente.findUnique({
        where: { usuarioId: userId },
      });
      if (paciente) {
        where.pacienteId = paciente.id;
      }
    } else if (userType === TipoUsuario.MEDICO) {
      const medico = await prisma.medico.findUnique({
        where: { usuarioId: userId },
      });
      if (medico) {
        where.medicoId = medico.id;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.pacienteId && userType !== TipoUsuario.PACIENTE) {
      where.pacienteId = filters.pacienteId;
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
              usuario: {
                select: { nome: true },
              },
            },
          },
          medico: {
            include: {
              usuario: {
                select: { nome: true },
              },
            },
          },
          itens: true,
          dispensacao: {
            include: {
              farmacia: {
                include: {
                  usuario: {
                    select: { nome: true },
                  },
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

  async buscarPorId(id: string, userId: string, userType: TipoUsuario) {
    const receita = await prisma.receita.findUnique({
      where: { id },
      include: {
        paciente: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
        medico: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
        itens: true,
        dispensacao: {
          include: {
            farmacia: {
              include: {
                usuario: {
                  select: { nome: true },
                },
              },
            },
          },
        },
      },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    if (userType === TipoUsuario.PACIENTE) {
      if (receita.paciente.usuario.id !== userId) {
        throw new ForbiddenError(
          "Você não tem permissão para ver esta receita"
        );
      }
    }

    return receita;
  }

  async buscarPorCodigo(codigo: string) {
    const receita = await prisma.receita.findUnique({
      where: { codigo },
      include: {
        paciente: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
        medico: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
        itens: true,
        dispensacao: {
          include: {
            farmacia: {
              include: {
                usuario: {
                  select: { nome: true },
                },
              },
            },
          },
        },
      },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    if (
      receita.validadeAte < new Date() &&
      receita.status === StatusReceita.ATIVA
    ) {
      await prisma.receita.update({
        where: { id: receita.id },
        data: { status: StatusReceita.VENCIDA },
      });
      receita.status = StatusReceita.VENCIDA;
    }

    return receita;
  }

  async atualizar(
    id: string,
    medicoUserId: string,
    data: AtualizarReceitaInput
  ) {
    const receita = await prisma.receita.findUnique({
      where: { id },
      include: { medico: true },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    const medico = await prisma.medico.findUnique({
      where: { usuarioId: medicoUserId },
    });

    if (!medico || receita.medicoId !== medico.id) {
      throw new ForbiddenError(
        "Você não tem permissão para editar esta receita"
      );
    }

    if (receita.status === StatusReceita.DISPENSADA) {
      throw new ValidationError(
        "Não é possível alterar uma receita já dispensada"
      );
    }

    const receitaAtualizada = await prisma.receita.update({
      where: { id },
      data: {
        validadeAte: data.validadeAte ? new Date(data.validadeAte) : undefined,
        observacoes: data.observacoes,
        diagnostico: data.diagnostico,
        status: data.status,
      },
      include: {
        itens: true,
        paciente: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
      },
    });

    return receitaAtualizada;
  }

  async cancelar(id: string, medicoUserId: string) {
    const receita = await prisma.receita.findUnique({
      where: { id },
      include: { medico: true },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    const medico = await prisma.medico.findUnique({
      where: { usuarioId: medicoUserId },
    });

    if (!medico || receita.medicoId !== medico.id) {
      throw new ForbiddenError(
        "Você não tem permissão para cancelar esta receita"
      );
    }

    if (receita.status === StatusReceita.DISPENSADA) {
      throw new ValidationError(
        "Não é possível cancelar uma receita já dispensada"
      );
    }

    const receitaCancelada = await prisma.receita.update({
      where: { id },
      data: { status: StatusReceita.CANCELADA },
    });

    return receitaCancelada;
  }

  async dispensar(
    receitaId: string,
    farmaciaUserId: string,
    observacoes?: string,
    itensDispensados?: any
  ) {
    const receita = await prisma.receita.findUnique({
      where: { id: receitaId },
    });

    if (!receita) {
      throw new NotFoundError("Receita não encontrada");
    }

    if (receita.status !== StatusReceita.ATIVA) {
      throw new ValidationError(
        `Esta receita está ${receita.status.toLowerCase()} e não pode ser dispensada`
      );
    }

    if (receita.validadeAte < new Date()) {
      await prisma.receita.update({
        where: { id: receitaId },
        data: { status: StatusReceita.VENCIDA },
      });
      throw new ValidationError("Esta receita está vencida");
    }

    const farmacia = await prisma.farmacia.findUnique({
      where: { usuarioId: farmaciaUserId },
    });

    if (!farmacia) {
      throw new ForbiddenError("Apenas farmácias podem dispensar receitas");
    }

    const [dispensacao] = await prisma.$transaction([
      prisma.dispensacao.create({
        data: {
          receitaId,
          farmaciaId: farmacia.id,
          observacoes,
          itensDispensados,
        },
        include: {
          receita: {
            include: {
              itens: true,
              paciente: {
                include: {
                  usuario: {
                    select: { nome: true },
                  },
                },
              },
            },
          },
          farmacia: {
            include: {
              usuario: {
                select: { nome: true },
              },
            },
          },
        },
      }),
      prisma.receita.update({
        where: { id: receitaId },
        data: { status: StatusReceita.DISPENSADA },
      }),
    ]);

    return dispensacao;
  }

  async renovar(id: string, medicoUserId: string, novaValidadeAte: string) {
    const receitaOriginal = await prisma.receita.findUnique({
      where: { id },
      include: { itens: true, medico: true },
    });

    if (!receitaOriginal) {
      throw new NotFoundError("Receita não encontrada");
    }

    const medico = await prisma.medico.findUnique({
      where: { usuarioId: medicoUserId },
    });

    if (!medico || receitaOriginal.medicoId !== medico.id) {
      throw new ForbiddenError(
        "Você não tem permissão para renovar esta receita"
      );
    }

    const novaReceita = await prisma.receita.create({
      data: {
        pacienteId: receitaOriginal.pacienteId,
        medicoId: medico.id,
        validadeAte: new Date(novaValidadeAte),
        observacoes: receitaOriginal.observacoes,
        diagnostico: receitaOriginal.diagnostico,
        itens: {
          create: receitaOriginal.itens.map((item) => ({
            medicamento: item.medicamento,
            principioAtivo: item.principioAtivo,
            dosagem: item.dosagem,
            formaFarmaceutica: item.formaFarmaceutica,
            quantidade: item.quantidade,
            posologia: item.posologia,
            observacao: item.observacao,
          })),
        },
      },
      include: {
        itens: true,
        paciente: {
          include: {
            usuario: {
              select: { nome: true },
            },
          },
        },
      },
    });

    return novaReceita;
  }

  async historicoDispensacoes(
    farmaciaUserId: string,
    filters: {
      dataInicio?: string;
      dataFim?: string;
      pacienteNome?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const farmacia = await prisma.farmacia.findUnique({
      where: { usuarioId: farmaciaUserId },
    });

    if (!farmacia) {
      throw new ForbiddenError("Farmácia não encontrada");
    }

    let where: any = {
      farmaciaId: farmacia.id,
    };

    if (filters.dataInicio || filters.dataFim) {
      where.dataHora = {};
      if (filters.dataInicio) {
        where.dataHora.gte = new Date(filters.dataInicio);
      }
      if (filters.dataFim) {
        const dataFim = new Date(filters.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        where.dataHora.lte = dataFim;
      }
    }

    if (filters.pacienteNome) {
      where.receita = {
        paciente: {
          usuario: {
            nome: {
              contains: filters.pacienteNome,
              mode: "insensitive",
            },
          },
        },
      };
    }

    const [dispensacoes, total] = await Promise.all([
      prisma.dispensacao.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataHora: "desc" },
        include: {
          receita: {
            include: {
              paciente: {
                include: {
                  usuario: {
                    select: { nome: true },
                  },
                },
              },
              medico: {
                include: {
                  usuario: {
                    select: { nome: true },
                  },
                },
              },
              itens: true,
            },
          },
        },
      }),
      prisma.dispensacao.count({ where }),
    ]);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [dispensacoesHoje, dispensacoesMes] = await Promise.all([
      prisma.dispensacao.count({
        where: {
          farmaciaId: farmacia.id,
          dataHora: { gte: hoje },
        },
      }),
      prisma.dispensacao.count({
        where: {
          farmaciaId: farmacia.id,
          dataHora: { gte: inicioMes },
        },
      }),
    ]);

    return {
      dispensacoes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      estatisticas: {
        hoje: dispensacoesHoje,
        mes: dispensacoesMes,
        total,
      },
    };
  }
}

export const receitasService = new ReceitasService();
