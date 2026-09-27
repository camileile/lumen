import "dotenv/config";
import { Category, normalizeCategory } from "../domain/score";
import { AppError } from "../security/app-error";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export type ORCategory = Category;

export type ORResult = {
  category: ORCategory; // A/B/C/D
  score: number; // 0..100
  summary: string;
  modelUsed?: string;
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  model?: unknown;
};

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (isRecord(parsed)) return parsed;
  } catch {
    // Try extracting a JSON object from a response with surrounding text.
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed: unknown = JSON.parse(m[0]);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Ignore malformed JSON and use the documented fallback below.
    }
  }
  return null;
}

async function readProviderJson(response: Response): Promise<OpenRouterResponse> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }

  const reader = response.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PROVIDER_RESPONSE_BYTES) {
      await reader.cancel();
      throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
    }
    chunks.push(value);
  }

  try {
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed as OpenRouterResponse : {};
  } catch {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }
}

// Free Models Router (muda ao longo do tempo)
const DEFAULT_MODEL = "openrouter/free";

export async function openrouterAnalyze(input: { url: string; domain: string }): Promise<ORResult> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AppError(503, "PROVIDER_UNAVAILABLE", "Serviço de análise indisponível");

  const messages: Msg[] = [
    {
      role: "system",
      content:
        [
          "Você é o classificador de confiabilidade do Lumen.",
          'Responda APENAS JSON válido, sem texto extra, no formato:',
          '{"category":"A|B|C|D","score":0-100,"summary":"resumo curto (1-2 frases)"}',
          "",
          "Regras:",
          "- A = fonte confiável / jornalismo de referência / órgão reconhecido",
          "- B = neutra / institucional / desconhecida sem sinais fortes",
          "- C = sensacionalista / clickbait / baixa qualidade editorial",
          "- D = desinformação / histórico forte de fake news",
          "- score deve refletir category (A alto, D baixo).",
        ].join("\n"),
    },
    { role: "user", content: JSON.stringify(input) },
  ];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal: ctrl.signal,
    headers,
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 220,
      // opcional: ajuda a “forçar” JSON em alguns modelos compatíveis
      response_format: { type: "json_object" },
    }),
  }).finally(() => clearTimeout(timer));

  const data = await readProviderJson(res);
  if (!res.ok) {
    throw new AppError(502, "PROVIDER_REQUEST_FAILED", "Serviço de análise indisponível");
  }

  const responseContent = data.choices?.[0]?.message?.content;
  if (typeof responseContent !== "string" || responseContent.length > 8_192) {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }
  const parsed = tryParseJson(responseContent);
  if (!parsed) throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");

  // aceita A/B/C/D ou legacy e mapeia
  const rawCat = typeof parsed.category === "string" ? parsed.category.trim() : "";
  const normalizedCategory = normalizeCategory(rawCat);
  if (!normalizedCategory) {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }
  const category: ORCategory = normalizedCategory;

  const scoreNum = parsed.score;
  if (typeof scoreNum !== "number" || !Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }
  const score = Math.round(scoreNum);

  if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
    throw new AppError(502, "PROVIDER_INVALID_RESPONSE", "Serviço de análise indisponível");
  }
  const summary = parsed.summary.trim().slice(0, 500);

  return {
    category,
    score,
    summary,
    modelUsed: typeof data.model === "string" ? data.model : undefined,
  };
}
