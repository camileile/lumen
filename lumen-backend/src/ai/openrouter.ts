import "dotenv/config";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export type ORResult = {
  category: "confiavel" | "neutro" | "sensacionalista" | "desinformacao" | "desconhecido";
  score: number; // 0..100
  summary: string;
  modelUsed?: string;
};

function tryParseJson(text: string) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

const allowed = new Set(["confiavel", "neutro", "sensacionalista", "desinformacao", "desconhecido"]);

// ✅ escolha 1: um modelo específico free (ex.: DeepSeek R1 free, ou DeepSeek chat free, etc.)
// ✅ escolha 2: usar o Free Models Router (recomendado porque muda ao longo do tempo)
// docs: :free suffix e Free Models Router :contentReference[oaicite:2]{index=2}
const DEFAULT_MODEL = "openrouter/free"; // Free Models Router
// alternativa: "deepseek/deepseek-r1:free" ou "deepseek/deepseek-chat-v3-0324:free" (depende do que estiver disponível)

export async function openrouterAnalyze(input: { url: string; domain: string }): Promise<ORResult> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurado");

  const messages: Msg[] = [
    {
      role: "system",
      content:
        'Você é um classificador de confiabilidade de fonte para o Lumen. Responda APENAS JSON válido: {"category":"confiavel|neutro|sensacionalista|desinformacao|desconhecido","score":0-100,"summary":"resumo curto"}',
    },
    { role: "user", content: JSON.stringify(input) },
  ];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // headers opcionais (ranking / analytics)
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
      max_tokens: 250,
    }),
  }).finally(() => clearTimeout(timer));

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `OpenRouter HTTP ${res.status}`);
  }

  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = tryParseJson(content) ?? {};

  const category = String(parsed.category ?? "desconhecido");
  const score = Number(parsed.score ?? 50);
  const summary = String(parsed.summary ?? "").slice(0, 500) || "Sem resumo.";

  return {
    category: allowed.has(category) ? (category as any) : "desconhecido",
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50,
    summary,
    modelUsed: data?.model, // geralmente vem preenchido
  };
}