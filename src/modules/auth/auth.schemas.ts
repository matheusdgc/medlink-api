import { z } from "zod";

// ==================== LOGIN SCHEMAS ====================

export const loginProfissionalSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const loginPacienteSchema = z.object({
  cpfOuCartaoSus: z.string().min(11, "CPF ou Cartão SUS inválido"),
  dataNascimento: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data de nascimento inválida",
  }),
});

// ==================== REGISTER SCHEMAS ====================

export const registerMedicoSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  crm: z.string().min(4, "CRM inválido"),
  ufCrm: z.string().length(2, "UF deve ter 2 caracteres"),
  especialidade: z.string().optional(),
  telefone: z.string().optional(),
  nomeClinica: z.string().optional(),
  enderecoClinica: z.string().optional(),
  telefoneClinica: z.string().optional(),
});

export const registerFarmaciaSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  crf: z.string().min(4, "CRF inválido"),
  ufCrf: z.string().length(2, "UF deve ter 2 caracteres"),
  razaoSocial: z.string().min(3, "Razão social inválida"),
  nomeFantasia: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});

export const registerPacienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().min(11, "CPF inválido"),
  dataNascimento: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data de nascimento inválida",
  }),
  sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().nullable(),
  cartaoSus: z.string().optional().nullable(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

export const updateMedicoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  telefone: z.string().optional().nullable(),
  especialidade: z.string().optional().nullable(),
  nomeClinica: z.string().optional().nullable(),
  enderecoClinica: z.string().optional().nullable(),
  telefoneClinica: z.string().optional().nullable(),
});

export const updateFarmaciaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  telefone: z.string().optional().nullable(),
  nomeFantasia: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
});
