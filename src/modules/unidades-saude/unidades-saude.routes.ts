import { Router } from "express";
import { unidadesSaudeController } from "./unidades-saude.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

router.get("/", (req, res) => unidadesSaudeController.listar(req, res));
router.get("/cidades", (req, res) =>
  unidadesSaudeController.listarCidades(req, res)
);
router.get("/tipos", (req, res) =>
  unidadesSaudeController.listarTipos(req, res)
);
router.get("/buscar-por-cep/:cep", (req, res) =>
  unidadesSaudeController.buscarPorCep(req, res)
);
router.get("/:id", (req, res) => unidadesSaudeController.buscarPorId(req, res));

router.post(
  "/",
  authMiddleware,
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA),
  (req, res) => unidadesSaudeController.criar(req, res)
);
router.put(
  "/:id",
  authMiddleware,
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA),
  (req, res) => unidadesSaudeController.atualizar(req, res)
);
router.delete(
  "/:id",
  authMiddleware,
  roleGuard(TipoUsuario.MEDICO, TipoUsuario.FARMACIA),
  (req, res) => unidadesSaudeController.excluir(req, res)
);

export default router;
