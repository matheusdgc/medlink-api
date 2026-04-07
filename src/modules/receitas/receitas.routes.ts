import { Router } from "express";
import { receitasController } from "./receitas.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { sensitiveLimiter } from "../../middleware/rateLimiter.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

router.use(authMiddleware);

router.get("/", (req, res) => receitasController.listar(req, res));

router.get(
  "/historico-dispensacoes",
  roleGuard(TipoUsuario.FARMACIA),
  (req, res) => receitasController.historicoDispensacoes(req, res)
);

router.get(
  "/codigo/:codigo",
  roleGuard(TipoUsuario.FARMACIA, TipoUsuario.MEDICO),
  (req, res) => receitasController.buscarPorCodigo(req, res)
);

router.get("/:id", (req, res) => receitasController.buscarPorId(req, res));

router.post("/", roleGuard(TipoUsuario.MEDICO), sensitiveLimiter, (req, res) =>
  receitasController.criar(req, res)
);

router.put("/:id", roleGuard(TipoUsuario.MEDICO), (req, res) =>
  receitasController.atualizar(req, res)
);

router.delete("/:id", roleGuard(TipoUsuario.MEDICO), (req, res) =>
  receitasController.cancelar(req, res)
);

router.post(
  "/:id/dispensar",
  roleGuard(TipoUsuario.FARMACIA),
  sensitiveLimiter,
  (req, res) => receitasController.dispensar(req, res)
);

router.post("/:id/renovar", roleGuard(TipoUsuario.MEDICO), (req, res) =>
  receitasController.renovar(req, res)
);

export default router;
