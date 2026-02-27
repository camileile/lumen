import { apiJson } from "./api";
import { getToken } from "./auth";

export type AnalysisItem = {
  id: string;
  url: string;
  domain: string;
  label?: "A" | "B" | "C" | "D";   // se backend salvar
  category?: string;              // confiavel/neutro/...
  score: number;
  summary: string;
  createdAt: string;
};

export async function getHistory() {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  return apiJson<{ items: AnalysisItem[] }>("/history", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}