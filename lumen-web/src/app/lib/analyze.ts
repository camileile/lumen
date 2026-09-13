import { apiJson } from "./api";
import { getToken } from "./auth";
import type { AnalysisItem } from "./history";
import type { AnalyzeMode } from "./types";

type AnalyzeResponse = {
  analysis: AnalysisItem;
  modelUsed?: string;
  mode?: AnalyzeMode;
};

export async function analyzeUrl(url: string): Promise<AnalyzeResponse> {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  return apiJson<AnalyzeResponse>("/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
}
