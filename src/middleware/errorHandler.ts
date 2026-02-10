import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../types/index.js";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {

  if (process.env.NODE_ENV === "development") {
    console.error("Error:", error);
  }

  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    res.status(422).json({
      status: "error",
      message: "Dados inválidos",
      errors: formattedErrors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
    return;
  }

  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as any;

    if (prismaError.code === "P2002") {
      const field = prismaError.meta?.target?.[0] || "campo";
      res.status(409).json({
        status: "error",
        message: `Este ${field} já está em uso`,
      });
      return;
    }

    if (prismaError.code === "P2025") {
      res.status(404).json({
        status: "error",
        message: "Registro não encontrado",
      });
      return;
    }
  }

  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : error.message,
  });
}
