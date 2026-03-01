import { apiJson } from "./api";
import { getToken } from "./auth";

export type LabelABCD = "A" | "B" | "C" | "D";
export type AnalyzeMode = "ai" | "local-fallback" | "local";

export type AnalysisItem = {
  id: string;
  url: string;
  domain: string;

  // ✅ novo padrão (unificado)
  label?: LabelABCD; // ideal: backend salva A/B/C/D aqui OU em "category"

  // compat: se o backend ainda salvar texto
  category?: string; // "confiavel" | "neutro" | "sensacionalista" | "desinformacao" | "desconhecido"

  score: number;
  summary: string;

  mode?: AnalyzeMode;
  modelUsed?: string;

  createdAt: string;
};

function mapLegacyCategoryToLabel(cat?: string): LabelABCD {
  const c = (cat || "").toLowerCase().trim();
  if (c === "confiavel") return "A";
  if (c === "neutro" || c === "desconhecido") return "B";
  if (c === "sensacionalista") return "C";
  if (c === "desinformacao") return "D";
  return "B";
}

export function normalizeLabel(item: AnalysisItem): LabelABCD {
  // se backend já manda label certo
  if (item.label === "A" || item.label === "B" || item.label === "C" || item.label === "D") return item.label;

  // às vezes backend salva A/B/C/D no campo category
  const cat = (item.category || "").trim();
  if (cat === "A" || cat === "B" || cat === "C" || cat === "D") return cat;

  // fallback legacy
  return mapLegacyCategoryToLabel(item.category);
}

export async function getHistory() {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  return apiJson<{ items: AnalysisItem[] }>("/history", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}