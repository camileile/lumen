import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { openrouterAnalyze } from "../ai/openrouter";

export async function analyzeController(req: AuthedRequest, res: Response) {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });
    if (!req.userId) return res.status(401).json({ error: "Não autenticado" });

    let domain = "";
    try { domain = new URL(url).hostname; }
    catch { return res.status(400).json({ error: "URL inválida" }); }

    const ai = await openrouterAnalyze({ url, domain });

    return res.json({
      url,
      domain,
      category: ai.category,
      score: ai.score,
      summary: ai.summary,
      modelUsed: ai.modelUsed,
    });
  } catch (e: any) {
    console.error("analyzeController:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Erro ao analisar" });
  }
}