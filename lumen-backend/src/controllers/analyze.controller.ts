// src/controllers/analyze.controller.ts
import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";
import { openrouterAnalyze } from "../ai/openrouter";

const confiaveis = ["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"];
const neutros = ["gov.br", "un.org", "who.int", "ibge.gov.br"];
const sensacionalistas = ["metropoles.com", "r7.com", "terra.com.br"];
const desinformacao = ["infowars.com", "naturalnews.com"];

function normalizeDomain(host: string) {
  return host.replace(/^www\./, "");
}

function classificarABCD(domain: string): "A" | "B" | "C" | "D" {
  const d = normalizeDomain(domain);
  if (confiaveis.some((s) => d.includes(s))) return "A";
  if (neutros.some((s) => d.includes(s))) return "B";
  if (sensacionalistas.some((s) => d.includes(s))) return "C";
  if (desinformacao.some((s) => d.includes(s))) return "D";
  return "B";
}

// fallback simples (sem histórico) mas com A/B/C/D igual à extensão
function fallbackLocalABCD(domain: string) {
  const label = classificarABCD(domain);

  const summary =
    label === "A"
      ? "Fonte com histórico mais confiável (fallback local)."
      : label === "B"
      ? "Fonte neutra / institucional (fallback local)."
      : label === "C"
      ? "Fonte com tendência sensacionalista (fallback local)."
      : "Fonte associada a desinformação (fallback local).";

  // score “compatível” (pode ser ajustado depois)
  const score = label === "A" ? 85 : label === "B" ? 60 : label === "C" ? 35 : 10;

  return { category: label, score, summary };
}

export async function analyzeController(req: AuthedRequest, res: Response) {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });
    if (!req.userId) return res.status(401).json({ error: "Não autenticado" });

    let domain = "";
    try {
      domain = new URL(url).hostname;
    } catch {
      return res.status(400).json({ error: "URL inválida" });
    }

    let category: "A" | "B" | "C" | "D" = "B";
    let score = 50;
    let summary = "Sem resumo.";
    let mode: "ai" | "local-fallback" = "ai";
    let modelUsed: string | undefined;

    try {
      // 🔥 IMPORTANT: openrouterAnalyze precisa devolver category "A/B/C/D" também
      const ai = await openrouterAnalyze({ url, domain: normalizeDomain(domain) });
      category = ai.category;         // "A" | "B" | "C" | "D"
      score = Math.round(ai.score);   // 0-100
      summary = ai.summary;
      modelUsed = ai.modelUsed;
      mode = "ai";
    } catch (e: any) {
      const msg = String(e?.message || e);
      const fb = fallbackLocalABCD(domain);
      category = fb.category;
      score = fb.score;
      summary = `${fb.summary} (IA indisponível: ${msg.slice(0, 80)})`;
      modelUsed = "fallback-local";
      mode = "local-fallback";
    }

    const analysis = await prisma.analysis.create({
      data: {
        url,
        domain: normalizeDomain(domain),
        category,      // agora salva "A/B/C/D"
        score,
        summary,
        text: summary,
        userId: req.userId,
      },
    });

    return res.json({ analysis, modelUsed: modelUsed ?? "unknown", mode });
  } catch (e: any) {
    console.error("analyzeController:", e?.stack || e);
    return res.status(500).json({ error: e?.message || "Erro ao analisar" });
  }
}