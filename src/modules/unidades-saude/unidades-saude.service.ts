import prisma from "../../config/database.js";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export class UnidadesSaudeService {
  async buscarCep(cep: string): Promise<ViaCepResponse | null> {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      return null;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  async buscarPorCep(
    cep: string,
    tipo?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const dadosCep = await this.buscarCep(cep);

    if (!dadosCep) {
      return {
        unidades: [],
        endereco: null,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;
    const where: any = { ativo: true };

    where.cidade = { contains: dadosCep.localidade, mode: "insensitive" };
    where.estado = dadosCep.uf;

    if (tipo) {
      where.tipo = tipo;
    }

    const [unidades, total] = await Promise.all([
      prisma.unidadeSaude.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.unidadeSaude.count({ where }),
    ]);

    return {
      unidades,
      endereco: {
        cep: dadosCep.cep,
        logradouro: dadosCep.logradouro,
        bairro: dadosCep.bairro,
        cidade: dadosCep.localidade,
        estado: dadosCep.uf,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listar(
    page: number = 1,
    limit: number = 20,
    busca?: string,
    tipo?: string,
    cidade?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = { ativo: true };

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: "insensitive" } },
        { endereco: { contains: busca, mode: "insensitive" } },
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (cidade) {
      where.cidade = { contains: cidade, mode: "insensitive" };
    }

    const [unidades, total] = await Promise.all([
      prisma.unidadeSaude.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.unidadeSaude.count({ where }),
    ]);

    return {
      unidades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async buscarPorId(id: string) {
    const unidade = await prisma.unidadeSaude.findUnique({
      where: { id },
    });

    if (!unidade) {
      throw new Error("Unidade de saúde não encontrada");
    }

    return unidade;
  }

  async listarCidades() {
    const unidades = await prisma.unidadeSaude.findMany({
      where: { ativo: true },
      select: { cidade: true },
      distinct: ["cidade"],
      orderBy: { cidade: "asc" },
    });

    return unidades.map((u: { cidade: string }) => u.cidade);
  }

  async listarTipos() {
    const unidades = await prisma.unidadeSaude.findMany({
      where: { ativo: true },
      select: { tipo: true },
      distinct: ["tipo"],
      orderBy: { tipo: "asc" },
    });

    return unidades.map((u: { tipo: string }) => u.tipo);
  }

  async criar(data: {
    nome: string;
    tipo: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    telefone?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const unidade = await prisma.unidadeSaude.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep || null,
        telefone: data.telefone || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        ativo: true,
      },
    });

    return unidade;
  }

  async atualizar(
    id: string,
    data: {
      nome?: string;
      tipo?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
      telefone?: string;
      latitude?: number;
      longitude?: number;
      ativo?: boolean;
    }
  ) {
    const unidadeExistente = await prisma.unidadeSaude.findUnique({
      where: { id },
    });

    if (!unidadeExistente) {
      throw new Error("Unidade de saúde não encontrada");
    }

    const unidade = await prisma.unidadeSaude.update({
      where: { id },
      data,
    });

    return unidade;
  }

  async excluir(id: string) {
    const unidadeExistente = await prisma.unidadeSaude.findUnique({
      where: { id },
    });

    if (!unidadeExistente) {
      throw new Error("Unidade de saúde não encontrada");
    }

    const unidade = await prisma.unidadeSaude.update({
      where: { id },
      data: { ativo: false },
    });

    return unidade;
  }
}

export const unidadesSaudeService = new UnidadesSaudeService();
