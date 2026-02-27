import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & { userId?: string };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // Se aparecer "ERRO_LUMEN_01", sabemos que o servidor atualizou!
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ERRO_LUMEN_01: Token ausente" });
  }

  const token = header.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: "ERRO_LUMEN_SECRET: Chave não configurada" });
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string };

    if (!payload.userId) {
      return res.status(401).json({ error: "ERRO_LUMEN_02: Payload inválido" });
    }

    req.userId = payload.userId;
    return next();
  } catch (error: any) {
    console.error("Erro JWT Detalhado:", error.message);
    return res.status(401).json({ error: "ERRO_LUMEN_03: Token expirado ou malformado" });
  }
}