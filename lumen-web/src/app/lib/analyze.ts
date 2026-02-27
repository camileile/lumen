import { apiJson } from "./api";
import { getToken } from "./auth";

export async function analyzeUrl(url: string) {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  return apiJson<{ analysis: any }>("/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
}