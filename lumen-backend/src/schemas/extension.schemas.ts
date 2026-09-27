import { z } from "zod";

const nonce = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const installationId = z.string().uuid();
const pkceValue = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);

export const createExtensionAuthorizationSchema = z.object({
  requestId: nonce,
  installationId,
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export const exchangeExtensionAuthorizationSchema = z.object({
  code: pkceValue,
  installationId,
  codeVerifier: pkceValue,
}).strict();
