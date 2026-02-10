import { Request, Response } from "express";
import { pacienteService } from "./pacientes.service.js";
import { z } from "zod";

const buscarPorDocumentoSchema = z.object({
  documento: z.string().min(11, "Documento inválido"),
});

const atualizarPacienteSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  dataNascimento: z.string().optional(),
  sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]).optional(),
  cartaoSus: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});

export class PacientesController {
  async listar(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const busca = req.query.busca as string | undefined;

    const result = await pacienteService.listar(page, limit, busca);

    res.json({
      status: "success",
      data: result,
    });
  }

  async meuPerfil(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const paciente = await pacienteService.meuPerfil(userId);

    res.json({
      status: "success",
      data: paciente,
    });
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userType = req.user!.tipo;

    const paciente = await pacienteService.buscarPorId(id, userId, userType);

    res.json({
      status: "success",
      data: paciente,
    });
  }

  async buscarPorDocumento(req: Request, res: Response): Promise<void> {
    const { documento } = buscarPorDocumentoSchema.parse({
      documento: req.params.documento,
    });

    const paciente = await pacienteService.buscarPorDocumento(documento);

    res.json({
      status: "success",
      data: paciente,
    });
  }

  async historicoReceitas(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userType = req.user!.tipo;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await pacienteService.historicoReceitas(
      id,
      userId,
      userType,
      page,
      limit
    );

    res.json({
      status: "success",
      data: result,
    });
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userType = req.user!.tipo;
    const data = atualizarPacienteSchema.parse(req.body);

    const paciente = await pacienteService.atualizar(
      id,
      userId,
      userType,
      data
    );

    res.json({
      status: "success",
      message: "Paciente atualizado com sucesso",
      data: paciente,
    });
  }
}

export const pacientesController = new PacientesController();
