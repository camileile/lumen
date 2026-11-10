// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyApiToken } from "../security/jwt";
import { AppError } from "../security/app-error";
import { assertActiveExtensionSession } from "../service/extension-session.service";

export type AuthedRequest = Request & {
  userId?: string;
  authKind?: "web" | "extension";
  installationId?: string;
  extensionSessionId?: string;
};

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Token ausente ou inválido" });
    }

    const verified = verifyApiToken(token);
    if (verified.authKind === "extension") {
      if (!verified.installationId || !verified.sessionId) {
        return res.status(401).json({ error: "Token inválido ou expirado", code: "INVALID_ACCESS_TOKEN" });
      }
      await assertActiveExtensionSession({
        sessionId: verified.sessionId,
        userId: verified.userId,
        installationId: verified.installationId,
      });
    }
    req.userId = verified.userId;
    req.authKind = verified.authKind;
    req.installationId = verified.installationId;
    req.extensionSessionId = verified.sessionId;
    return next();
  } catch (error) {
    if (error instanceof AppError && error.status >= 500) return next(error);
    return res.status(401).json({ error: "Token inválido ou expirado", code: "INVALID_ACCESS_TOKEN" });
  }
}
