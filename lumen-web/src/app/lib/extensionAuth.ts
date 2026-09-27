import { apiJson } from "./api";

export type ExtensionConnectRequest = {
  requestId: string;
  installationId: string;
  codeChallenge: string;
};

const noncePattern = /^[A-Za-z0-9_-]{16,128}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const challengePattern = /^[A-Za-z0-9_-]{43}$/;

export function parseExtensionConnectRequest(params: Pick<URLSearchParams, "get">): ExtensionConnectRequest | null {
  const requestId = params.get("requestId") ?? "";
  const installationId = params.get("installationId") ?? "";
  const codeChallenge = params.get("codeChallenge") ?? "";
  return noncePattern.test(requestId) && uuidPattern.test(installationId) && challengePattern.test(codeChallenge)
    ? { requestId, installationId, codeChallenge }
    : null;
}

export function safeLoginReturnPath(path: string | null): string {
  if (!path) return "/dashboard";
  try {
    const parsed = new URL(path, "http://lumen.local");
    return parsed.origin === "http://lumen.local" && parsed.pathname === "/extension/connect"
      ? `${parsed.pathname}${parsed.search}`
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function createExtensionAuthorization(token: string, request: ExtensionConnectRequest) {
  return apiJson<{ authorizationCode: string; expiresAt: string }>("/extension/authorizations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  });
}
