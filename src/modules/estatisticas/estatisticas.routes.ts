import { Router } from "express";
import { TipoUsuario } from "@prisma/client";
import { estatisticasController } from "./estatisticas.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";

const router = Router();

// Todas as rotas de estatisticas exigem autenticacao
router.use(authMiddleware);

// Medico e Farmacia tem acesso as estatisticas globais
const profissionalGuard = roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA);

router.get("/visao-geral", profissionalGuard, (req, res) =>
  estatisticasController.visaoGeral(req, res)
);

router.get("/receitas-por-mes", profissionalGuard, (req, res) =>
  estatisticasController.receitasPorMes(req, res)
);

router.get("/medicamentos-mais-receitados", profissionalGuard, (req, res) =>
  estatisticasController.medicamentosMaisReceitados(req, res)
);

router.get("/receitas-por-status", profissionalGuard, (req, res) =>
  estatisticasController.receitasPorStatus(req, res)
);

router.get("/medicos-ranking", profissionalGuard, (req, res) =>
  estatisticasController.medicosRanking(req, res)
);

router.get("/diagnosticos", profissionalGuard, (req, res) =>
  estatisticasController.diagnosticos(req, res)
);

// Estatisticas pessoais: apenas MEDICO (dados das proprias receitas)
router.get("/minhas", roleGuard(TipoUsuario.MEDICO), (req, res) =>
  estatisticasController.minhasEstatisticas(req, res)
);

export default router;
