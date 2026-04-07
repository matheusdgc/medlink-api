import { TipoUsuario } from "@prisma/client";
import prisma from "../../config/database.js";
import { NotFoundError, ForbiddenError } from "../../types/index.js";

export class PacienteService {
  async listar(page: number = 1, limit: number = 20, busca?: string) {
    const skip = (page - 1) * limit;

    const where = busca
      ? {
          OR: [
            {
              usuario: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
            { cpf: { contains: busca } },
            { cartaoSus: { contains: busca } },
          ],
        }
      : {};

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { usuario: { nome: "asc" } },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              ativo: true,
            },
          },
        },
      }),
      prisma.paciente.count({ where }),
    ]);

    return {
      pacientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async buscarPorId(
    id: string,
    requestingUserId: string,
    requestingUserType: TipoUsuario
  ) {
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
            criadoEm: true,
          },
        },
        receitas: {
          orderBy: { criadaEm: "desc" },
          take: 10,
          include: {
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
    });

    if (!paciente) {
      throw new NotFoundError("Paciente não encontrado");
    }

    if (requestingUserType === TipoUsuario.PACIENTE) {
      const pacienteDoUsuario = await prisma.paciente.findUnique({
        where: { usuarioId: requestingUserId },
      });

      if (pacienteDoUsuario?.id !== id) {
        throw new ForbiddenError(
          "Você não tem permissão para ver este paciente"
        );
      }
    }

    return paciente;
  }

  async buscarPorDocumento(documento: string) {
    const documentoLimpo = documento.replace(/[\.\-\s]/g, "");

    const pacientes = await prisma.paciente.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
            criadoEm: true,
          },
        },
      },
    });

    const paciente = pacientes.find((p: (typeof pacientes)[number]) => {
      const cpfLimpo = p.cpf.replace(/[\.\-\s]/g, "");
      const cartaoSusLimpo = p.cartaoSus?.replace(/[\.\-\s]/g, "") || "";
      return cpfLimpo === documentoLimpo || cartaoSusLimpo === documentoLimpo;
    });

    if (!paciente) {
      throw new NotFoundError("Paciente não encontrado");
    }

    return paciente;
  }

  async historicoReceitas(
    pacienteId: string,
    requestingUserId: string,
    requestingUserType: TipoUsuario,
    page: number = 1,
    limit: number = 20
  ) {
    if (requestingUserType === TipoUsuario.PACIENTE) {
      const paciente = await prisma.paciente.findUnique({
        where: { usuarioId: requestingUserId },
      });

      if (paciente?.id !== pacienteId) {
        throw new ForbiddenError(
          "Você não tem permissão para ver este histórico"
        );
      }
    }

    const skip = (page - 1) * limit;

    const [receitas, total] = await Promise.all([
      prisma.receita.findMany({
        where: { pacienteId },
        skip,
        take: limit,
        orderBy: { criadaEm: "desc" },
        include: {
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
      prisma.receita.count({ where: { pacienteId } }),
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

  async atualizar(
    id: string,
    requestingUserId: string,
    requestingUserType: TipoUsuario,
    data: {
      nome?: string;
      email?: string;
      dataNascimento?: string;
      sexo?: "MASCULINO" | "FEMININO" | "OUTRO";
      cartaoSus?: string;
      telefone?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
    }
  ) {
    if (requestingUserType === TipoUsuario.PACIENTE) {
      const paciente = await prisma.paciente.findUnique({
        where: { usuarioId: requestingUserId },
      });

      if (paciente?.id !== id) {
        throw new ForbiddenError(
          "Você não tem permissão para editar este paciente"
        );
      }
    }

    const pacienteAtual = await prisma.paciente.findUnique({
      where: { id },
    });

    if (!pacienteAtual) {
      throw new NotFoundError("Paciente não encontrado");
    }

    if (data.nome || data.email) {
      await prisma.usuario.update({
        where: { id: pacienteAtual.usuarioId },
        data: {
          ...(data.nome && { nome: data.nome }),
          ...(data.email && { email: data.email }),
        },
      });
    }

    const pacienteAtualizado = await prisma.paciente.update({
      where: { id },
      data: {
        ...(data.dataNascimento && {
          dataNascimento: new Date(data.dataNascimento),
        }),
        ...(data.sexo && { sexo: data.sexo }),
        ...(data.cartaoSus !== undefined && {
          cartaoSus: data.cartaoSus || null,
        }),
        ...(data.telefone !== undefined && { telefone: data.telefone || null }),
        ...(data.endereco !== undefined && { endereco: data.endereco || null }),
        ...(data.cidade !== undefined && { cidade: data.cidade || null }),
        ...(data.estado !== undefined && { estado: data.estado || null }),
        ...(data.cep !== undefined && { cep: data.cep || null }),
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
          },
        },
      },
    });

    return pacienteAtualizado;
  }

  async meuPerfil(usuarioId: string) {
    const paciente = await prisma.paciente.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
            criadoEm: true,
          },
        },
        receitas: {
          orderBy: { criadaEm: "desc" },
          include: {
            medico: {
              include: {
                usuario: {
                  select: { nome: true },
                },
              },
            },
            itens: true,
            dispensacao: true,
          },
        },
      },
    });

    if (!paciente) {
      throw new NotFoundError("Perfil de paciente não encontrado");
    }

    return paciente;
  }
}

export const pacienteService = new PacienteService();
