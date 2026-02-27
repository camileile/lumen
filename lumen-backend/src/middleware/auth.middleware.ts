import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & { userId?: string };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const token = header.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "JWT_SECRET não configurado" });

  try {
    const payload = jwt.verify(token, secret) as { sub?: string };
    if (!payload.sub) return res.status(401).json({ error: "Token inválido" });

    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido/expirado" });
  }
console.log("Authorization header:", req.headers.authorization);
}