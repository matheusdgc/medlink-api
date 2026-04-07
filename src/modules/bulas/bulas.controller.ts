import { Request, Response } from "express";
import { bulasService } from "./bulas.service.js";

export class BulasController {
  async consultar(req: Request, res: Response): Promise<void> {
    const medicamento = req.params.medicamento as string;

    if (!medicamento || medicamento.trim().length < 2) {
      res.status(400).json({
        status: "error",
        message: "Nome do medicamento deve ter pelo menos 2 caracteres",
      });
      return;
    }

    const bula = await bulasService.consultarBulaIA(medicamento.trim());

    if (!bula) {
      res.status(404).json({
        status: "error",
        message: `Não foi possível encontrar informações sobre "${medicamento}". Verifique o nome e tente novamente.`,
        data: null,
      });
      return;
    }

    res.json({
      status: "success",
      message: "Bula consultada com sucesso",
      data: {
        ...bula,
        fonte: "IA",
        disclaimer:
          "Informações geradas por IA. Sempre consulte a bula oficial do medicamento e um profissional de saúde para orientações específicas.",
      },
    });
  }

  async sugestoes(req: Request, res: Response): Promise<void> {
    const termo = req.params.termo as string;

    if (!termo || termo.trim().length < 2) {
      res.json({
        status: "success",
        data: [],
      });
      return;
    }

    const sugestoes = await bulasService.sugerirMedicamentos(termo.trim());

    res.json({
      status: "success",
      data: sugestoes,
    });
  }
}

export const bulasController = new BulasController();
