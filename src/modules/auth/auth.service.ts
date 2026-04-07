import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TipoUsuario } from "@prisma/client";
import prisma from "../../config/database.js";
import { getEnvConfig } from "../../config/env.js";
import {
  JwtPayload,
  TokenPair,
  AuthResponse,
  LoginRequest,
  LoginPacienteRequest,
  RegisterMedicoRequest,
  RegisterFarmaciaRequest,
  RegisterPacienteRequest,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "../../types/index.js";

export class AuthService {
  private generateTokens(payload: Omit<JwtPayload, "iat" | "exp">): TokenPair {
    const config = getEnvConfig();

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const config = getEnvConfig();

    const expiresInDays = parseInt(config.JWT_REFRESH_EXPIRES_IN) || 30;
    const expiraEm = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token,
        usuarioId: userId,
        expiraEm,
      },
    });
  }

  async loginProfissional(data: LoginRequest): Promise<AuthResponse> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email },
      include: {
        medico: true,
        farmacia: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedError("Email ou senha incorretos");
    }

    if (usuario.tipo === TipoUsuario.PACIENTE) {
      throw new UnauthorizedError("Use o login de paciente");
    }

    const senhaValida = await bcrypt.compare(data.senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedError("Email ou senha incorretos");
    }

    if (!usuario.ativo) {
      throw new UnauthorizedError("Usuário inativo");
    }

    const tokenPayload: Omit<JwtPayload, "iat" | "exp"> = {
      userId: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    };

    const tokens = this.generateTokens(tokenPayload);
    await this.saveRefreshToken(usuario.id, tokens.refreshToken);

    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
      },
      tokens,
    };
  }

  async loginPaciente(data: LoginPacienteRequest): Promise<AuthResponse> {
    const identificadorLimpo = data.cpfOuCartaoSus.replace(/[\.\-\s]/g, "");

    const paciente = await prisma.paciente.findFirst({
      where: {
        OR: [{ cpf: identificadorLimpo }, { cartaoSus: identificadorLimpo }],
      },
      include: {
        usuario: true,
      },
    });

    if (!paciente) {
      throw new UnauthorizedError("CPF ou Cartão SUS não encontrado");
    }

    const dataNascimentoInformada = new Date(data.dataNascimento);
    const dataNascimentoCadastrada = new Date(paciente.dataNascimento);

    const isSameDate =
      dataNascimentoInformada.getFullYear() ===
        dataNascimentoCadastrada.getFullYear() &&
      dataNascimentoInformada.getMonth() ===
        dataNascimentoCadastrada.getMonth() &&
      dataNascimentoInformada.getDate() === dataNascimentoCadastrada.getDate();

    if (!isSameDate) {
      throw new UnauthorizedError("Data de nascimento incorreta");
    }

    // Verifica o PIN se o paciente tiver um cadastrado.
    // Pacientes antigos (sem PIN) continuam podendo logar normalmente,
    // mas pacientes que definiram PIN precisam informa-lo.
    if (paciente.pin) {
      if (!data.pin) {
        throw new UnauthorizedError("PIN obrigatório");
      }
      const pinValido = await bcrypt.compare(data.pin, paciente.pin);
      if (!pinValido) {
        throw new UnauthorizedError("PIN incorreto");
      }
    }

    if (!paciente.usuario.ativo) {
      throw new UnauthorizedError("Usuário inativo");
    }

    const tokenPayload: Omit<JwtPayload, "iat" | "exp"> = {
      userId: paciente.usuario.id,
      email: paciente.usuario.email,
      tipo: TipoUsuario.PACIENTE,
    };

    const tokens = this.generateTokens(tokenPayload);
    await this.saveRefreshToken(paciente.usuario.id, tokens.refreshToken);

    return {
      user: {
        id: paciente.usuario.id,
        email: paciente.usuario.email,
        nome: paciente.usuario.nome,
        tipo: TipoUsuario.PACIENTE,
      },
      tokens,
    };
  }

  async registerMedico(data: RegisterMedicoRequest): Promise<AuthResponse> {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Este email já está em uso");
    }

    const existingCrm = await prisma.medico.findFirst({
      where: { crm: data.crm, ufCrm: data.ufCrm },
    });

    if (existingCrm) {
      throw new ConflictError("Este CRM já está cadastrado");
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: data.email,
        senha: senhaHash,
        nome: data.nome,
        tipo: TipoUsuario.MEDICO,
        medico: {
          create: {
            crm: data.crm,
            ufCrm: data.ufCrm.toUpperCase(),
            especialidade: data.especialidade,
            telefone: data.telefone,
            nomeClinica: data.nomeClinica,
            enderecoClinica: data.enderecoClinica,
            telefoneClinica: data.telefoneClinica,
          },
        },
      },
    });

    const tokenPayload: Omit<JwtPayload, "iat" | "exp"> = {
      userId: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    };

    const tokens = this.generateTokens(tokenPayload);
    await this.saveRefreshToken(usuario.id, tokens.refreshToken);

    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
      },
      tokens,
    };
  }

  async registerFarmacia(data: RegisterFarmaciaRequest): Promise<AuthResponse> {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Este email já está em uso");
    }

    const existingCnpj = await prisma.farmacia.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existingCnpj) {
      throw new ConflictError("Este CNPJ já está cadastrado");
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: data.email,
        senha: senhaHash,
        nome: data.nome,
        tipo: TipoUsuario.FARMACIA,
        farmacia: {
          create: {
            cnpj: data.cnpj,
            crf: data.crf,
            ufCrf: data.ufCrf.toUpperCase(),
            razaoSocial: data.razaoSocial,
            nomeFantasia: data.nomeFantasia,
            telefone: data.telefone,
            endereco: data.endereco,
            cidade: data.cidade,
            estado: data.estado?.toUpperCase(),
            cep: data.cep,
          },
        },
      },
    });

    const tokenPayload: Omit<JwtPayload, "iat" | "exp"> = {
      userId: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    };

    const tokens = this.generateTokens(tokenPayload);
    await this.saveRefreshToken(usuario.id, tokens.refreshToken);

    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
      },
      tokens,
    };
  }

  async registerPaciente(
    data: RegisterPacienteRequest
  ): Promise<{ paciente: any }> {
    const cpfLimpo = data.cpf.replace(/[\.\-]/g, "");

    if (data.email) {
      const existingUser = await prisma.usuario.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictError("Este email já está em uso");
      }
    }

    const existingCpf = await prisma.paciente.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (existingCpf) {
      throw new ConflictError("Este CPF já está cadastrado");
    }

    const emailFinal = data.email || `paciente_${cpfLimpo}@medlink.local`;

    const senhaHash = await bcrypt.hash(Math.random().toString(36), 10);

    // Se o PIN foi informado, faz o hash antes de salvar.
    // Nunca armazenamos senhas ou PINs em texto puro no banco.
    const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : null;

    const usuario = await prisma.usuario.create({
      data: {
        email: emailFinal,
        senha: senhaHash,
        nome: data.nome,
        tipo: TipoUsuario.PACIENTE,
        paciente: {
          create: {
            cpf: cpfLimpo,
            cartaoSus: data.cartaoSus?.replace(/\s/g, "") || null,
            dataNascimento: new Date(data.dataNascimento),
            sexo: data.sexo,
            telefone: data.telefone,
            pin: pinHash,
          },
        },
      },
      include: {
        paciente: true,
      },
    });

    return {
      paciente: {
        id: usuario.paciente?.id,
        nome: usuario.nome,
        cpf: cpfLimpo,
        email: data.email || null,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const config = getEnvConfig();

    try {
      const decoded = jwt.verify(
        refreshToken,
        config.JWT_REFRESH_SECRET
      ) as JwtPayload;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { usuario: true },
      });

      if (!storedToken) {
        throw new UnauthorizedError("Token inválido");
      }

      if (storedToken.expiraEm < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new UnauthorizedError("Token expirado");
      }

      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      const tokenPayload: Omit<JwtPayload, "iat" | "exp"> = {
        userId: decoded.userId,
        email: decoded.email,
        tipo: decoded.tipo,
      };

      const tokens = this.generateTokens(tokenPayload);
      await this.saveRefreshToken(decoded.userId, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("Token inválido");
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getProfile(userId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        paciente: true,
        medico: true,
        farmacia: true,
      },
    });

    if (!usuario) {
      throw new NotFoundError("Usuário não encontrado");
    }

    const { senha, ...userWithoutPassword } = usuario;

    return userWithoutPassword;
  }

  async updateMedicoProfile(
    userId: string,
    data: {
      nome?: string;
      telefone?: string | null;
      especialidade?: string | null;
      nomeClinica?: string | null;
      enderecoClinica?: string | null;
      telefoneClinica?: string | null;
    }
  ) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { medico: true },
    });

    if (!usuario || !usuario.medico) {
      throw new NotFoundError("Médico não encontrado");
    }

    if (data.nome) {
      await prisma.usuario.update({
        where: { id: userId },
        data: { nome: data.nome },
      });
    }

    const updatedMedico = await prisma.medico.update({
      where: { id: usuario.medico.id },
      data: {
        telefone: data.telefone,
        especialidade: data.especialidade,
        nomeClinica: data.nomeClinica,
        enderecoClinica: data.enderecoClinica,
        telefoneClinica: data.telefoneClinica,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nome: true,
            tipo: true,
          },
        },
      },
    });

    return updatedMedico;
  }

  async updateFarmaciaProfile(
    userId: string,
    data: {
      nome?: string;
      telefone?: string | null;
      nomeFantasia?: string | null;
      endereco?: string | null;
      cidade?: string | null;
      estado?: string | null;
      cep?: string | null;
    }
  ) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { farmacia: true },
    });

    if (!usuario || !usuario.farmacia) {
      throw new NotFoundError("Farmácia não encontrada");
    }

    if (data.nome) {
      await prisma.usuario.update({
        where: { id: userId },
        data: { nome: data.nome },
      });
    }

    const updatedFarmacia = await prisma.farmacia.update({
      where: { id: usuario.farmacia.id },
      data: {
        telefone: data.telefone,
        nomeFantasia: data.nomeFantasia,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nome: true,
            tipo: true,
          },
        },
      },
    });

    return updatedFarmacia;
  }
}

export const authService = new AuthService();
