import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authMiddleware, roleGuard } from "../../middleware/auth.js";
import { TipoUsuario } from "@prisma/client";

const router = Router();

// Todas as rotas deste modulo exigem autenticacao E tipo ADMIN.
// O roleGuard garante que apenas admins acessem estes endpoints.
// Cast necessario pois TipoUsuario.ADMIN so existira apos "npx prisma generate".
router.use(authMiddleware);
router.use(roleGuard("ADMIN" as TipoUsuario));

// GET /api/admin/resumo — totais para o painel
router.get("/resumo", (req, res) => adminController.obterResumo(req, res));

// GET /api/admin/receitas — lista todas as receitas do sistema
router.get("/receitas", (req, res) => adminController.listarReceitas(req, res));

// DELETE /api/admin/receitas/:id — delecao permanente (diferente do PATCH status=CANCELADA)
router.delete("/receitas/:id", (req, res) =>
  adminController.deletarReceita(req, res)
);

export default router;
