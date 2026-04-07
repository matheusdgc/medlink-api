import { Request, Response } from "express";
import { estatisticasService } from "./estatisticas.service.js";

export class EstatisticasController {
  async visaoGeral(_req: Request, res: Response): Promise<void> {
    const data = await estatisticasService.visaoGeral();
    res.json({ status: "success", data });
  }

  async receitasPorMes(req: Request, res: Response): Promise<void> {
    const meses = Math.min(parseInt(req.query.meses as string) || 6, 24);
    const data = await estatisticasService.receitasPorMes(meses);
    res.json({ status: "success", data });
  }

  async medicamentosMaisReceitados(req: Request, res: Response): Promise<void> {
    const limite = Math.min(parseInt(req.query.limite as string) || 10, 50);
    const data = await estatisticasService.medicamentosMaisReceitados(limite);
    res.json({ status: "success", data });
  }

  async receitasPorStatus(_req: Request, res: Response): Promise<void> {
    const data = await estatisticasService.receitasPorStatus();
    res.json({ status: "success", data });
  }

  async medicosRanking(req: Request, res: Response): Promise<void> {
    const limite = Math.min(parseInt(req.query.limite as string) || 10, 50);
    const data = await estatisticasService.medicosRanking(limite);
    res.json({ status: "success", data });
  }

  async diagnosticos(req: Request, res: Response): Promise<void> {
    const limite = Math.min(parseInt(req.query.limite as string) || 10, 50);
    const busca = req.query.busca as string | undefined;
    const mes = req.query.mes ? parseInt(req.query.mes as string) : undefined;
    const ano = req.query.ano ? parseInt(req.query.ano as string) : undefined;
    const data = await estatisticasService.diagnosticos({ limite, busca, mes, ano });
    res.json({ status: "success", data });
  }

  async minhasEstatisticas(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = await estatisticasService.minhasEstatisticas(userId);
    res.json({ status: "success", data });
  }
}

export const estatisticasController = new EstatisticasController();
