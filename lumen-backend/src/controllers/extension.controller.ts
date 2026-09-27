import type { Response } from "express";
import prisma from "../db/prisma";
import { ExtensionAuthorizationRegistry } from "../domain/extension-authorization";
import type { AuthedRequest } from "../middleware/auth.middleware";
import { AppError } from "../security/app-error";
import { signExtensionSessionToken } from "../security/jwt";
import { SAFE_USER_SELECT } from "../security/safe-user";

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

  const user = await prisma.user.findUnique({ where: { id: grant.userId }, select: SAFE_USER_SELECT });
  if (!user) throw new AppError(400, "INVALID_EXTENSION_AUTHORIZATION", "Autorização inválida ou expirada");

  return res.json({
    token: signExtensionSessionToken(user.id, grant.installationId),
    expiresInSeconds: 24 * 60 * 60,
    user,
  });
}
