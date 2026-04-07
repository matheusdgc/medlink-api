import { Request, Response } from "express";
import { authService } from "./auth.service.js";
import {
  loginProfissionalSchema,
  loginPacienteSchema,
  registerMedicoSchema,
  registerFarmaciaSchema,
  registerPacienteSchema,
  refreshTokenSchema,
  updateMedicoSchema,
  updateFarmaciaSchema,
} from "./auth.schemas.js";

export class AuthController {
  async loginProfissional(req: Request, res: Response): Promise<void> {
    const data = loginProfissionalSchema.parse(req.body);
    const result = await authService.loginProfissional(data);

    res.json({
      status: "success",
      data: result,
    });
  }

  async loginPaciente(req: Request, res: Response): Promise<void> {
    const data = loginPacienteSchema.parse(req.body);
    const result = await authService.loginPaciente(data);

    res.json({
      status: "success",
      data: result,
    });
  }

  async registerMedico(req: Request, res: Response): Promise<void> {
    const data = registerMedicoSchema.parse(req.body);
    const result = await authService.registerMedico(data);

    res.status(201).json({
      status: "success",
      message: "Médico cadastrado com sucesso",
      data: result,
    });
  }

  async registerFarmacia(req: Request, res: Response): Promise<void> {
    const data = registerFarmaciaSchema.parse(req.body);
    const result = await authService.registerFarmacia(data);

    res.status(201).json({
      status: "success",
      message: "Farmácia cadastrada com sucesso",
      data: result,
    });
  }

  async registerPaciente(req: Request, res: Response): Promise<void> {
    const data = registerPacienteSchema.parse(req.body);
    const result = await authService.registerPaciente(data);

    res.status(201).json({
      status: "success",
      message: "Paciente cadastrado com sucesso",
      data: result,
    });
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      status: "success",
      data: { tokens },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      status: "success",
      message: "Logout realizado com sucesso",
    });
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const profile = await authService.getProfile(userId);

    res.json({
      status: "success",
      data: profile,
    });
  }

  async updateMedicoProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = updateMedicoSchema.parse(req.body);
    const profile = await authService.updateMedicoProfile(userId, data);

    res.json({
      status: "success",
      message: "Perfil atualizado com sucesso",
      data: profile,
    });
  }

  async updateFarmaciaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = updateFarmaciaSchema.parse(req.body);
    const profile = await authService.updateFarmaciaProfile(userId, data);

    res.json({
      status: "success",
      message: "Perfil atualizado com sucesso",
      data: profile,
    });
  }
}

export const authController = new AuthController();
