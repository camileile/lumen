import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "./app-error";

export const JWT_ALGORITHM = "HS256" as const;
export const JWT_ISSUER = process.env.JWT_ISSUER?.trim() || "lumen-api";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE?.trim() || "lumen-web-extension";
export const JWT_EXPIRES_IN = "7d";
export const EXTENSION_JWT_AUDIENCE = "lumen-extension-session";
export const EXTENSION_SESSION_EXPIRES_IN = "24h";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new AppError(500, "AUTH_CONFIGURATION_ERROR", "Serviço de autenticação indisponível");
  }
  return secret;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({}, jwtSecret(), {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: userId,
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): { userId: string; payload: JwtPayload } {
  const secret = jwtSecret();
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token inválido ou expirado");
  }

  if (typeof decoded === "string" || typeof decoded.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.sub)) {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token inválido ou expirado");
  }

  return { userId: decoded.sub, payload: decoded };
}

export function signExtensionSessionToken(userId: string, installationId: string): string {
  return jwt.sign({ tokenUse: "extension", installationId }, jwtSecret(), {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: EXTENSION_JWT_AUDIENCE,
    subject: userId,
    expiresIn: EXTENSION_SESSION_EXPIRES_IN,
  });
}

export function verifyExtensionSessionToken(token: string): {
  userId: string;
  installationId: string;
  payload: JwtPayload;
} {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, jwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: EXTENSION_JWT_AUDIENCE,
    });
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token inválido ou expirado");
  }

  if (typeof decoded === "string" || decoded.tokenUse !== "extension" ||
      typeof decoded.installationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.installationId) ||
      typeof decoded.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.sub)) {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token inválido ou expirado");
  }

  return { userId: decoded.sub, installationId: decoded.installationId, payload: decoded };
}

export function verifyApiToken(token: string): {
  userId: string;
  authKind: "web" | "extension";
  installationId?: string;
} {
  try {
    return { userId: verifyAccessToken(token).userId, authKind: "web" };
  } catch (error) {
    if (error instanceof AppError && error.status >= 500) throw error;
  }

  const extension = verifyExtensionSessionToken(token);
  return {
    userId: extension.userId,
    authKind: "extension",
    installationId: extension.installationId,
  };
}
