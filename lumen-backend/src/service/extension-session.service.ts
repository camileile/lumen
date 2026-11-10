import { createHash, randomBytes } from "node:crypto";
import prisma from "../db/prisma";
import { EXTENSION_ACCESS_TOKEN_EXPIRES_IN_SECONDS, signExtensionSessionToken } from "../security/jwt";
import { SAFE_USER_SELECT } from "../security/safe-user";
import { AppError } from "../security/app-error";

export const EXTENSION_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function refreshTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

function invalidSession(): AppError {
  return new AppError(401, "INVALID_EXTENSION_SESSION", "Sessão da extensão inválida ou expirada");
}

function sessionPayload(user: { id: string; name: string; email: string; createdAt: Date }, input: {
  id: string;
  installationId: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}) {
  return {
    accessToken: signExtensionSessionToken(user.id, input.installationId, input.id),
    accessExpiresInSeconds: EXTENSION_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshToken: input.refreshToken,
    refreshExpiresAt: input.refreshExpiresAt.toISOString(),
    user,
  };
}

export async function createExtensionSession(userId: string, installationId: string) {
  const refreshToken = newRefreshToken();
  const now = new Date();
  const refreshExpiresAt = new Date(now.getTime() + EXTENSION_REFRESH_TOKEN_TTL_MS);
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.extensionSession.deleteMany({ where: { userId, installationId } });
    const session = await transaction.extensionSession.create({
      data: {
        userId,
        installationId,
        refreshTokenHash: refreshTokenHash(refreshToken),
        createdAt: now,
        lastUsedAt: now,
        expiresAt: refreshExpiresAt,
      },
    });
    const user = await transaction.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
    if (!user) throw invalidSession();
    return { session, user };
  });

  return sessionPayload(result.user, {
    id: result.session.id,
    installationId,
    refreshToken,
    refreshExpiresAt,
  });
}

export async function refreshExtensionSession(installationId: string, currentRefreshToken: string) {
  const currentHash = refreshTokenHash(currentRefreshToken);
  const session = await prisma.extensionSession.findUnique({
    where: { refreshTokenHash: currentHash },
    include: { user: { select: SAFE_USER_SELECT } },
  });
  const now = new Date();
  if (!session || session.installationId !== installationId || session.revokedAt || session.expiresAt <= now) {
    throw invalidSession();
  }

  const nextRefreshToken = newRefreshToken();
  const updated = await prisma.extensionSession.updateMany({
    where: {
      id: session.id,
      refreshTokenHash: currentHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { refreshTokenHash: refreshTokenHash(nextRefreshToken), lastUsedAt: now },
  });
  if (updated.count !== 1) throw invalidSession();

  return sessionPayload(session.user, {
    id: session.id,
    installationId,
    refreshToken: nextRefreshToken,
    refreshExpiresAt: session.expiresAt,
  });
}

export async function assertActiveExtensionSession(input: {
  sessionId: string;
  userId: string;
  installationId: string;
}) {
  const session = await prisma.extensionSession.findUnique({ where: { id: input.sessionId } });
  if (!session || session.userId !== input.userId || session.installationId !== input.installationId ||
      session.revokedAt || session.expiresAt <= new Date()) {
    throw invalidSession();
  }
}

export async function revokeCurrentExtensionSession(sessionId: string, userId: string) {
  await prisma.extensionSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listExtensionSessions(userId: string) {
  const sessions = await prisma.extensionSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      installationId: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
  return sessions.map((session) => ({
    ...session,
    status: session.revokedAt ? "revoked" : session.expiresAt <= new Date() ? "expired" : "active",
  }));
}

export async function revokeExtensionSessionForUser(userId: string, sessionId: string) {
  const result = await prisma.extensionSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count !== 1) {
    throw new AppError(404, "EXTENSION_SESSION_NOT_FOUND", "Sessão da extensão não encontrada");
  }
}
