import { normalizeHostname } from "../domain/source-classifier";
import { AppError } from "./app-error";
import { isForbiddenHostname } from "./ssrf-policy";

export const MAX_ANALYSIS_URL_LENGTH = 2048;

const PRIVATE_QUERY_KEYS = new Set([
  "accesstoken", "apikey", "auth", "authorization", "code", "cookie", "credential",
  "idtoken", "jwt", "key", "nonce", "pass", "password", "refreshtoken", "samlresponse",
  "secret", "session", "sessionid", "sessiontoken", "sig", "signature", "state", "ticket", "token",
]);
const TRACKING_QUERY_KEYS = /^(?:utm_.+|fbclid|gclid|dclid|mc_[ce]id|ref_src)$/i;

export type SanitizedAnalysisUrl = {
  url: string;
  hostname: string;
};

export function sanitizeAnalysisUrl(value: unknown): SanitizedAnalysisUrl {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "INVALID_URL", "URL inválida");
  }

  const input = value.trim();
  if (input.length > MAX_ANALYSIS_URL_LENGTH) {
    throw new AppError(400, "URL_TOO_LONG", "URL excede o tamanho máximo permitido");
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new AppError(400, "INVALID_URL", "URL inválida");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(400, "UNSUPPORTED_URL_SCHEME", "Apenas URLs HTTP e HTTPS são permitidas");
  }
  if (parsed.username || parsed.password) {
    throw new AppError(400, "URL_CREDENTIALS_NOT_ALLOWED", "Credenciais embutidas na URL não são permitidas");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || isForbiddenHostname(hostname)) {
    throw new AppError(400, "URL_HOST_NOT_ALLOWED", "O host informado não é permitido");
  }

  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    const canonicalKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const sensitiveValue = parsed.searchParams.getAll(key).some((queryValue) =>
      /^(?:bearer\s+|sk-)/i.test(queryValue) || /^[^.\s]+\.[^.\s]+\.[^.\s]+$/.test(queryValue));
    if (PRIVATE_QUERY_KEYS.has(canonicalKey) || TRACKING_QUERY_KEYS.test(key) || sensitiveValue) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();

  const sanitized = parsed.toString();
  if (sanitized.length > MAX_ANALYSIS_URL_LENGTH) {
    throw new AppError(400, "URL_TOO_LONG", "URL excede o tamanho máximo permitido");
  }

  return { url: sanitized, hostname };
}
