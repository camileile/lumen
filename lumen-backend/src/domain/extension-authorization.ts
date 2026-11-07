import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const EXTENSION_AUTHORIZATION_TTL_MS = 2 * 60 * 1000;
const MAX_PENDING_AUTHORIZATIONS = 512;

export type ExtensionAuthorizationGrant = {
  userId: string;
  installationId: string;
  requestId: string;
};

type PendingAuthorization = ExtensionAuthorizationGrant & {
  codeChallenge: string;
  expiresAt: number;
};

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function codeKey(value: string): string {
  return digest(value).toString("base64url");
}

export function pkceChallengeFromVerifier(verifier: string): string {
  return digest(verifier).toString("base64url");
}

function safelyEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export class ExtensionAuthorizationRegistry {
  private readonly pending = new Map<string, PendingAuthorization>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly createCode: () => string = () => randomBytes(32).toString("base64url"),
  ) {}

  issue(input: ExtensionAuthorizationGrant & { codeChallenge: string }) {
    this.removeExpired();
    if (this.pending.size >= MAX_PENDING_AUTHORIZATIONS) {
      const oldest = this.pending.keys().next().value;
      if (oldest) this.pending.delete(oldest);
    }

    const code = this.createCode();
    const expiresAt = this.now() + EXTENSION_AUTHORIZATION_TTL_MS;
    this.pending.set(codeKey(code), { ...input, expiresAt });
    return { code, expiresAt };
  }

  consume(input: { code: string; installationId: string; codeVerifier: string }): ExtensionAuthorizationGrant | null {
    const key = codeKey(input.code);
    const item = this.pending.get(key);
    if (!item) return null;

    this.pending.delete(key);
    if (item.expiresAt <= this.now()) return null;
    if (!safelyEqual(item.installationId, input.installationId)) return null;
    if (!safelyEqual(item.codeChallenge, pkceChallengeFromVerifier(input.codeVerifier))) return null;

    return { userId: item.userId, installationId: item.installationId, requestId: item.requestId };
  }

  clear() {
    this.pending.clear();
  }

  private removeExpired() {
    for (const [key, item] of this.pending) {
      if (item.expiresAt <= this.now()) this.pending.delete(key);
    }
  }
}
