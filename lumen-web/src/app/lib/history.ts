import { apiJson } from "./api";
import { getToken } from "./auth";
import type { HistoryResponse, LabelABCD, AnalyzeMode } from "./types";

export type AnalysisItem = {
  id: string;
  url: string;
  domain: string;
  label?: LabelABCD;
  category?: string;
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
  if (item.label === "A" || item.label === "B" || item.label === "C" || item.label === "D") {
    return item.label;
  }

  const cat = (item.category || "").trim();
  if (cat === "A" || cat === "B" || cat === "C" || cat === "D") {
    return cat;
  }

  return mapLegacyCategoryToLabel(item.category);
}

export async function getHistory(): Promise<HistoryResponse> {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  const data = await apiJson<HistoryResponse>("/history", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      label: normalizeLabel(item as AnalysisItem),
    })),
  };
}