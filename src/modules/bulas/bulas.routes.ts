import { Router } from "express";
import { bulasController } from "./bulas.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

router.use(authMiddleware);
router.use(
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA, TipoUsuario.PACIENTE)
);

router.get("/consultar/:medicamento", (req, res) =>
  bulasController.consultar(req, res)
);

router.get("/sugestoes/:termo", (req, res) =>
  bulasController.sugestoes(req, res)
);

export default router;
