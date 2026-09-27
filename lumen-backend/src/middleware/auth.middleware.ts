// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyApiToken } from "../security/jwt";
import { AppError } from "../security/app-error";

export type AuthedRequest = Request & {
  userId?: string;
  authKind?: "web" | "extension";
  installationId?: string;
};

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Token ausente ou inválido" });
    }

    const verified = verifyApiToken(token);
    req.userId = verified.userId;
    req.authKind = verified.authKind;
    req.installationId = verified.installationId;
    return next();
  } catch (error) {
    if (error instanceof AppError && error.status >= 500) return next(error);
    return res.status(401).json({ error: "Token inválido ou expirado", code: "INVALID_ACCESS_TOKEN" });
  }
}
