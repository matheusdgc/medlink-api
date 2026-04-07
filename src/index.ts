import "dotenv/config";
import "express-async-errors";

import express from "express";
import cors from "cors";

import { getEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimiter.js";

import authRoutes from "./modules/auth/auth.routes.js";
import pacientesRoutes from "./modules/pacientes/pacientes.routes.js";
import receitasRoutes from "./modules/receitas/receitas.routes.js";
import unidadesSaudeRoutes from "./modules/unidades-saude/unidades-saude.routes.js";
import bulasRoutes from "./modules/bulas/bulas.routes.js";
import estatisticasRoutes from "./modules/estatisticas/estatisticas.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();
const config = getEnvConfig();

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:5173",
      "https://medlink-self.vercel.app",
      config.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/receitas", receitasRoutes);
app.use("/api/unidades-saude", unidadesSaudeRoutes);
app.use("/api/bulas", bulasRoutes);
app.use("/api/estatisticas", estatisticasRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: "error",
    message: "Rota não encontrada",
  });
});

app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   MedLink API Server                                      ║
  ║                                                           ║
  ║   Server running on http://localhost:${config.PORT}       ║
  ║   Environment: ${config.NODE_ENV.padEnd(36)}              ║
  ║                                                           ║
  ║   Routes:                                                 ║
  ║   - POST /api/auth/login/profissional                     ║
  ║   - POST /api/auth/login/paciente                         ║
  ║   - POST /api/auth/register/medico                        ║
  ║   - POST /api/auth/register/farmacia                      ║
  ║   - POST /api/auth/register/paciente                      ║
  ║   - GET  /api/auth/me                                     ║
  ║   - GET  /api/pacientes                                   ║
  ║   - GET  /api/receitas                                    ║
  ║   - POST /api/receitas                                    ║
  ║   - GET  /api/unidades-saude                              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
