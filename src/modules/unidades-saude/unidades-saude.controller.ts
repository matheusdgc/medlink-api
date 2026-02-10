import { Request, Response } from "express";
import { unidadesSaudeService } from "./unidades-saude.service.js";

export class UnidadesSaudeController {
  async listar(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const busca = req.query.busca as string | undefined;
    const tipo = req.query.tipo as string | undefined;
    const cidade = req.query.cidade as string | undefined;

    const result = await unidadesSaudeService.listar(
      page,
      limit,
      busca,
      tipo,
      cidade
    );

    res.json({
      status: "success",
      data: result,
    });
  }

  async buscarPorCep(req: Request, res: Response): Promise<void> {
    const { cep } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const tipo = req.query.tipo as string | undefined;

    const result = await unidadesSaudeService.buscarPorCep(
      cep,
      tipo,
      page,
      limit
    );

    res.json({
      status: "success",
      data: result,
    });
  }

  async listarCidades(_req: Request, res: Response): Promise<void> {
    const cidades = await unidadesSaudeService.listarCidades();

    res.json({
      status: "success",
      data: cidades,
    });
  }

  async listarTipos(_req: Request, res: Response): Promise<void> {
    const tipos = await unidadesSaudeService.listarTipos();

    res.json({
      status: "success",
      data: tipos,
    });
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const unidade = await unidadesSaudeService.buscarPorId(id);

    res.json({
      status: "success",
      data: unidade,
    });
  }

  async criar(req: Request, res: Response): Promise<void> {
    const {
      nome,
      tipo,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      latitude,
      longitude,
    } = req.body;

    if (!nome || !tipo || !endereco || !cidade || !estado) {
      res.status(400).json({
        status: "error",
        message: "Campos obrigatórios: nome, tipo, endereco, cidade, estado",
      });
      return;
    }

    const unidade = await unidadesSaudeService.criar({
      nome,
      tipo,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    });

    res.status(201).json({
      status: "success",
      data: unidade,
    });
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const {
      nome,
      tipo,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      latitude,
      longitude,
      ativo,
    } = req.body;

    const unidade = await unidadesSaudeService.atualizar(id, {
      nome,
      tipo,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
      ativo,
    });

    res.json({
      status: "success",
      data: unidade,
    });
  }

  async excluir(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await unidadesSaudeService.excluir(id);

    res.json({
      status: "success",
      message: "Unidade de saúde desativada com sucesso",
    });
  }
}

export const unidadesSaudeController = new UnidadesSaudeController();
