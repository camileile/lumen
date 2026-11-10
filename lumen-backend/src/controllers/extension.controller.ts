import type { Response } from "express";
import prisma from "../db/prisma";
import { ExtensionAuthorizationRegistry } from "../domain/extension-authorization";
import type { AuthedRequest } from "../middleware/auth.middleware";
import { AppError } from "../security/app-error";
import {
  createExtensionSession,
  listExtensionSessions,
  refreshExtensionSession,
  revokeCurrentExtensionSession,
  revokeExtensionSessionForUser,
} from "../service/extension-session.service";

export const extensionAuthorizationRegistry = new ExtensionAuthorizationRegistry();

export async function createExtensionAuthorization(req: AuthedRequest, res: Response) {
  if (!req.userId || req.authKind !== "web") {
    throw new AppError(403, "WEB_SESSION_REQUIRED", "Entre no dashboard para autorizar a extensão");
  }

  const { requestId, installationId, codeChallenge } = req.body as {
    requestId: string;
    installationId: string;
    codeChallenge: string;
  };
  const authorization = extensionAuthorizationRegistry.issue({
    userId: req.userId,
    requestId,
    installationId,
    codeChallenge,
  });

  return res.status(201).json({
    authorizationCode: authorization.code,
    expiresAt: new Date(authorization.expiresAt).toISOString(),
  });
}

export async function exchangeExtensionAuthorization(req: AuthedRequest, res: Response) {
  const { code, installationId, codeVerifier } = req.body as {
    code: string;
    installationId: string;
    codeVerifier: string;
  };
  const grant = extensionAuthorizationRegistry.consume({ code, installationId, codeVerifier });
  if (!grant) {
    throw new AppError(400, "INVALID_EXTENSION_AUTHORIZATION", "Autorização inválida ou expirada");
  }

  const user = await prisma.user.findUnique({ where: { id: grant.userId }, select: { id: true } });
  if (!user) throw new AppError(400, "INVALID_EXTENSION_AUTHORIZATION", "Autorização inválida ou expirada");
  return res.json(await createExtensionSession(user.id, grant.installationId));
}

export async function refreshExtensionSessionController(req: AuthedRequest, res: Response) {
  const { installationId, refreshToken } = req.body as { installationId: string; refreshToken: string };
  return res.json(await refreshExtensionSession(installationId, refreshToken));
}

export async function logoutExtensionSession(req: AuthedRequest, res: Response) {
  if (!req.userId || req.authKind !== "extension" || !req.extensionSessionId) {
    throw new AppError(403, "EXTENSION_SESSION_REQUIRED", "Sessão da extensão necessária");
  }
  await revokeCurrentExtensionSession(req.extensionSessionId, req.userId);
  return res.status(204).send();
}

export async function getExtensionSessions(req: AuthedRequest, res: Response) {
  if (!req.userId || req.authKind !== "web") {
    throw new AppError(403, "WEB_SESSION_REQUIRED", "Entre no dashboard para gerenciar extensões");
  }
  return res.json({ sessions: await listExtensionSessions(req.userId) });
}

export async function revokeExtensionSession(req: AuthedRequest, res: Response) {
  if (!req.userId || req.authKind !== "web") {
    throw new AppError(403, "WEB_SESSION_REQUIRED", "Entre no dashboard para gerenciar extensões");
  }
  const { sessionId } = req.body as { sessionId: string };
  await revokeExtensionSessionForUser(req.userId, sessionId);
  return res.status(204).send();
}
