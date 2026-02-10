import { Router } from "express";
import { pacientesController } from "./pacientes.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

router.use(authMiddleware);

router.get("/me", roleGuard(TipoUsuario.PACIENTE), (req, res) =>
  pacientesController.meuPerfil(req, res)
);

router.get(
  "/",
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA),
  (req, res) => pacientesController.listar(req, res)
);

router.get(
  "/documento/:documento",
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA),
  (req, res) => pacientesController.buscarPorDocumento(req, res)
);

router.get("/:id", (req, res) => pacientesController.buscarPorId(req, res));

router.get("/:id/receitas", (req, res) =>
  pacientesController.historicoReceitas(req, res)
);

router.put("/:id", (req, res) => pacientesController.atualizar(req, res));

export default router;
