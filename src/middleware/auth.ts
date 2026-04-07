import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnvConfig } from "../config/env.js";
import { JwtPayload, UnauthorizedError } from "../types/index.js";
import { TipoUsuario } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError("Token não fornecido");
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    throw new UnauthorizedError("Token mal formatado");
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    throw new UnauthorizedError("Token mal formatado");
  }

  try {
    const config = getEnvConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expirado");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Token inválido");
    }
    throw new UnauthorizedError("Falha na autenticação");
  }
}

export function roleGuard(...allowedTypes: TipoUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("Usuário não autenticado");
    }

    // ADMIN Master bypassa qualquer restricao de papel.
    // Isso evita ter que adicionar TipoUsuario.ADMIN em cada roleGuard
    // espalhado pelo codigo — qualquer rota protegida por roleGuard
    // e automaticamente acessivel pelo admin.
    //
    // Cast para string porque TipoUsuario.ADMIN so existira no tipo gerado
    // pelo Prisma apos rodar "npx prisma generate" ou "npx prisma db push".
    if ((req.user.tipo as string) === "ADMIN") {
      return next();
    }

    if (!allowedTypes.includes(req.user.tipo)) {
      throw new UnauthorizedError(
        `Acesso restrito para: ${allowedTypes.join(", ")}`
      );
    }

    next();
  };
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return next();
  }

  try {
    const config = getEnvConfig();
    const decoded = jwt.verify(parts[1], config.JWT_SECRET) as JwtPayload;
    req.user = decoded;
  } catch {}

  next();
}
