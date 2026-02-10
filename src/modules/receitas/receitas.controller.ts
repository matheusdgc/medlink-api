import { Request, Response } from "express";
import { receitasService } from "./receitas.service.js";
import {
  criarReceitaSchema,
  atualizarReceitaSchema,
  dispensarReceitaSchema,
  renovarReceitaSchema,
  listarReceitasQuerySchema,
} from "./receitas.schemas.js";

export class ReceitasController {
  async criar(req: Request, res: Response): Promise<void> {
    const data = criarReceitaSchema.parse(req.body);
    const userId = req.user!.userId;

    const receita = await receitasService.criar(userId, data);

    res.status(201).json({
      status: "success",
      message: "Receita criada com sucesso",
      data: receita,
    });
  }

  async listar(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const userType = req.user!.tipo;
    const filters = listarReceitasQuerySchema.parse(req.query);

    const result = await receitasService.listar(userId, userType, filters);

    res.json({
      status: "success",
      data: result,
    });
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userType = req.user!.tipo;

    const receita = await receitasService.buscarPorId(id, userId, userType);

    res.json({
      status: "success",
      data: receita,
    });
  }

  async buscarPorCodigo(req: Request, res: Response): Promise<void> {
    const { codigo } = req.params;

    const receita = await receitasService.buscarPorCodigo(codigo);

    res.json({
      status: "success",
      data: receita,
    });
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const data = atualizarReceitaSchema.parse(req.body);

    const receita = await receitasService.atualizar(id, userId, data);

    res.json({
      status: "success",
      message: "Receita atualizada com sucesso",
      data: receita,
    });
  }

  async cancelar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;

    const receita = await receitasService.cancelar(id, userId);

    res.json({
      status: "success",
      message: "Receita cancelada com sucesso",
      data: receita,
    });
  }

  async dispensar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { observacoes, itensDispensados } = dispensarReceitaSchema.parse(
      req.body
    );

    const dispensacao = await receitasService.dispensar(
      id,
      userId,
      observacoes,
      itensDispensados
    );

    res.json({
      status: "success",
      message: "Receita dispensada com sucesso",
      data: dispensacao,
    });
  }

  async renovar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { novaValidadeAte } = renovarReceitaSchema.parse(req.body);

    const novaReceita = await receitasService.renovar(
      id,
      userId,
      novaValidadeAte
    );

    res.status(201).json({
      status: "success",
      message: "Receita renovada com sucesso",
      data: novaReceita,
    });
  }

  async historicoDispensacoes(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { dataInicio, dataFim, pacienteNome, page, limit } = req.query;

    const result = await receitasService.historicoDispensacoes(userId, {
      dataInicio: dataInicio as string,
      dataFim: dataFim as string,
      pacienteNome: pacienteNome as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      status: "success",
      data: result,
    });
  }
}

export const receitasController = new ReceitasController();
