import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

router.use(authMiddleware);
router.use(roleGuard("ADMIN" as TipoUsuario));

router.get("/resumo", (req, res) => adminController.obterResumo(req, res));
router.get("/receitas", (req, res) => adminController.listarReceitas(req, res));
router.delete("/receitas/:id", (req, res) =>
  adminController.deletarReceita(req, res)
);

export default router;
