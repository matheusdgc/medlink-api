import { z } from "zod";
import { StatusReceita } from "@prisma/client";

export const criarReceitaSchema = z.object({
  pacienteId: z.string().uuid("ID do paciente inválido"),
  validadeAte: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data de validade inválida",
  }),
  observacoes: z.string().optional(),
  diagnostico: z.string().optional(),
  itens: z
    .array(
      z.object({
        medicamento: z.string().min(1, "Nome do medicamento é obrigatório"),
        principioAtivo: z.string().optional(),
        dosagem: z.string().min(1, "Dosagem é obrigatória"),
        formaFarmaceutica: z.string().optional(),
        quantidade: z
          .number()
          .int()
          .positive("Quantidade deve ser maior que 0"),
        posologia: z.string().min(1, "Posologia é obrigatória"),
        observacao: z.string().optional(),
      })
    )
    .min(1, "A receita deve ter pelo menos um medicamento"),
});

export const atualizarReceitaSchema = z.object({
  validadeAte: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Data de validade inválida",
    })
    .optional(),
  observacoes: z.string().optional(),
  diagnostico: z.string().optional(),
  status: z.nativeEnum(StatusReceita).optional(),
});

export const dispensarReceitaSchema = z.object({
  observacoes: z.string().optional(),
  itensDispensados: z.any().optional(),
});

export const renovarReceitaSchema = z.object({
  novaValidadeAte: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data de validade inválida",
  }),
});

export const listarReceitasQuerySchema = z.object({
  status: z.nativeEnum(StatusReceita).optional(),
  pacienteId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
