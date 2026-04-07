import { Request, Response } from "express";
import { z } from "zod";
import { adminService } from "./admin.service.js";
import { StatusReceita } from "@prisma/client";

const listarReceitasQuerySchema = z.object({
  status: z.nativeEnum(StatusReceita).optional(),
  pacienteNome: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export class AdminController {
  async deletarReceita(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    const resultado = await adminService.deletarReceita(id);

    res.json({
      status: "success",
      message: resultado.mensagem,
      data: { id: resultado.id },
    });
  }

  async listarReceitas(req: Request, res: Response): Promise<void> {
    const filters = listarReceitasQuerySchema.parse(req.query);

    const resultado = await adminService.listarTodasReceitas(filters);

    res.json({
      status: "success",
      data: resultado,
    });
  }

  async obterResumo(req: Request, res: Response): Promise<void> {
    const resumo = await adminService.obterResumo();

    res.json({
      status: "success",
      data: resumo,
    });
  }
}

export const adminController = new AdminController();
