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

export async function getHistory(): Promise<HistoryResponse> {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  return apiJson<HistoryResponse>("/history", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}
