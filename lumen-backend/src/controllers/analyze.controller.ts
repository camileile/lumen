import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";
import { openrouterAnalyze } from "../ai/openrouter";

// ✅ suas listas presetadas (mesmas da extensão)
const confiaveis = ["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"];
const neutros = ["gov.br", "un.org", "who.int", "ibge.gov.br"];
const sensacionalistas = ["metropoles.com", "r7.com", "terra.com.br"];
const desinformacao = ["infowars.com", "naturalnews.com"];

function classificarLocal(domain: string): { category: string; score: number; summary: string } {
  const d = domain.replace(/^www\./, "");
  if (confiaveis.some((s) => d.includes(s)))
    return { category: "confiavel", score: 85, summary: "Fonte confiável (fallback local)." };
  if (neutros.some((s) => d.includes(s)))
    return { category: "neutro", score: 60, summary: "Fonte neutra/institucional (fallback local)." };
  if (sensacionalistas.some((s) => d.includes(s)))
    return { category: "sensacionalista", score: 35, summary: "Fonte sensacionalista (fallback local)." };
  if (desinformacao.some((s) => d.includes(s)))
    return { category: "desinformacao", score: 10, summary: "Fonte associada à desinformação (fallback local)." };
  return { category: "desconhecido", score: 50, summary: "Fonte desconhecida (fallback local)." };
}

export async function analyzeController(req: AuthedRequest, res: Response) {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });
    if (!req.userId) return res.status(401).json({ error: "Não autenticado" });

    let domain = "";
    try { domain = new URL(url).hostname; }
    catch { return res.status(400).json({ error: "URL inválida" }); }

    // ✅ tenta IA; se falhar por rate limit, cai no preset
    let category = "desconhecido";
    let score = 50;
    let summary = "Sem resumo.";
    let modelUsed: string | undefined;

    try {
      const ai = await openrouterAnalyze({ url, domain });
      category = ai.category;
      score = Math.round(ai.score);
      summary = ai.summary;
      modelUsed = ai.modelUsed;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("Rate limit exceeded")) {
        const fb = classificarLocal(domain);
        category = fb.category;
        score = fb.score;
        summary = fb.summary;
      } else {
        throw e; // erro diferente → mantém 500
      }
    }

    const analysis = await prisma.analysis.create({
      data: {
        url,
        domain,
        category,
        score,
        summary,
        text: summary,     // seu schema exige "text"
        userId: req.userId,
      },
    });

    return res.json({ analysis, modelUsed: modelUsed ?? "fallback-local" });
  } catch (e: any) {
    console.error("analyzeController:", e?.stack || e);
    return res.status(500).json({ error: e?.message || "Erro ao analisar" });
  }
}