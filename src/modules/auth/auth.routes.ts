import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import {
  authLimiter,
  createAccountLimiter,
} from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/login/profissional", authLimiter, (req, res) =>
  authController.loginProfissional(req, res)
);
router.post("/login/paciente", authLimiter, (req, res) =>
  authController.loginPaciente(req, res)
);
router.post("/register/medico", createAccountLimiter, (req, res) =>
  authController.registerMedico(req, res)
);
router.post("/register/farmacia", createAccountLimiter, (req, res) =>
  authController.registerFarmacia(req, res)
);
router.post("/register/paciente", createAccountLimiter, (req, res) =>
  authController.registerPaciente(req, res)
);
router.post("/refresh", (req, res) => authController.refreshToken(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));

router.get("/me", authMiddleware, (req, res) =>
  authController.getProfile(req, res)
);
router.put("/perfil/medico", authMiddleware, (req, res) =>
  authController.updateMedicoProfile(req, res)
);
router.put("/perfil/farmacia", authMiddleware, (req, res) =>
  authController.updateFarmaciaProfile(req, res)
);

export default router;
