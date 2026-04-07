import { TipoUsuario } from "@prisma/client";

// ==================== AUTH TYPES ====================

export interface JwtPayload {
  userId: string;
  email: string;
  tipo: TipoUsuario;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ==================== REQUEST TYPES ====================

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginPacienteRequest {
  cpfOuCartaoSus: string;
  dataNascimento: string;
  pin?: string;
}

export interface RegisterMedicoRequest {
  email: string;
  senha: string;
  nome: string;
  crm: string;
  ufCrm: string;
  especialidade?: string;
  telefone?: string;
  nomeClinica?: string;
  enderecoClinica?: string;
  telefoneClinica?: string;
}

export interface RegisterFarmaciaRequest {
  email: string;
  senha: string;
  nome: string;
  cnpj: string;
  crf: string;
  ufCrf: string;
  razaoSocial: string;
  nomeFantasia?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface RegisterPacienteRequest {
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: "MASCULINO" | "FEMININO" | "OUTRO";
  telefone: string;
  email?: string | null;
  cartaoSus?: string | null;
  pin?: string | null;
}

// ==================== RESPONSE TYPES ====================

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nome: string;
    tipo: TipoUsuario;
  };
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  tipo: TipoUsuario;
  paciente?: {
    id: string;
    cpf: string;
    cartaoSus: string | null;
    dataNascimento: Date;
    sexo: string | null;
    telefone: string | null;
  };
  medico?: {
    id: string;
    crm: string;
    ufCrm: string;
    especialidade: string | null;
    nomeClinica: string | null;
  };
  farmacia?: {
    id: string;
    cnpj: string;
    crf: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  };
}

// ==================== ERROR TYPES ====================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Não autorizado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acesso negado") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso não encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflito de dados") {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Dados inválidos") {
    super(message, 422);
  }
}
