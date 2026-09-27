// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../security/jwt";
import { AppError } from "../security/app-error";

export type AuthedRequest = Request & { userId?: string };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Token ausente ou inválido" });
    }

    req.userId = verifyAccessToken(token).userId;
    return next();
  } catch (error) {
    if (error instanceof AppError && error.status >= 500) return next(error);
    return res.status(401).json({ error: "Token inválido ou expirado", code: "INVALID_ACCESS_TOKEN" });
  }
}
