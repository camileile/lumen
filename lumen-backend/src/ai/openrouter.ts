import "dotenv/config";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export type ORCategory = "A" | "B" | "C" | "D";

export type ORResult = {
  category: ORCategory; // A/B/C/D
  score: number; // 0..100
  summary: string;
  modelUsed?: string;
};

function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

const allowedABCD = new Set<ORCategory>(["A", "B", "C", "D"]);

// compat: se vier o formato antigo
function mapLegacyCategory(cat: string): ORCategory {
  const c = cat.toLowerCase().trim();
  if (c === "confiavel") return "A";
  if (c === "neutro" || c === "desconhecido") return "B";
  if (c === "sensacionalista") return "C";
  if (c === "desinformacao") return "D";
  return "B";
}

// Free Models Router (muda ao longo do tempo)
const DEFAULT_MODEL = "openrouter/free";

export async function openrouterAnalyze(input: { url: string; domain: string }): Promise<ORResult> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurado");

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

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const msg = data?.error?.message ?? `OpenRouter HTTP ${res.status}`;
    throw new Error(`OPENROUTER_ERROR: ${msg}`);
  }

  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = tryParseJson(content) ?? {};

  // aceita A/B/C/D ou legacy e mapeia
  const rawCat = String(parsed.category ?? "B").trim();
  const category: ORCategory = allowedABCD.has(rawCat as ORCategory)
    ? (rawCat as ORCategory)
    : mapLegacyCategory(rawCat);

  const scoreNum = Number(parsed.score ?? 50);
  const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : 50;

  const summary = String(parsed.summary ?? "").slice(0, 500) || "Sem resumo.";

  return {
    category,
    score,
    summary,
    modelUsed: data?.model,
  };
}