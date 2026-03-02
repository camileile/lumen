// src/controllers/analyze.controller.ts
import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";
import { openrouterAnalyze } from "../ai/openrouter";

const confiaveis = ["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"];
const neutros = ["gov.br", "un.org", "who.int", "ibge.gov.br"];
const sensacionalistas = ["metropoles.com", "r7.com", "terra.com.br"];
const desinformacao = ["infowars.com", "naturalnews.com"];

const pesos: Record<"A" | "B" | "C" | "D", number> = { A: 3, B: 1, C: -2, D: -5 };

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

function scoreFromHistorico(historico: number[]) {
  const soma = historico.reduce((a, b) => a + b, 0);
  const media = soma / historico.length;
  let score = Math.round(((media + 5) / 8) * 100);
  score = Math.max(0, Math.min(100, score));
  return score;
}

function summaryByLabel(label: "A" | "B" | "C" | "D", source: "ai" | "local") {
  const base =
    label === "A"
      ? "Fonte com histórico mais confiável"
      : label === "B"
      ? "Fonte neutra / institucional"
      : label === "C"
      ? "Fonte com tendência sensacionalista"
      : "Fonte associada a desinformação";

  return `${base} (${source === "ai" ? "IA" : "lista local"}).`;
}

async function computeGlobalScoreForUser(userId: string, currentLabel: "A" | "B" | "C" | "D") {
  // pega as últimas 19 análises (porque a atual ainda não foi salva)
  const last = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 19,
    select: { category: true }, // category guarda A/B/C/D
  });

  const hist = last
    .map((x) => String(x.category) as "A" | "B" | "C" | "D")
    .filter((c): c is "A" | "B" | "C" | "D" => c === "A" || c === "B" || c === "C" || c === "D")
    .map((c) => pesos[c]);

  // adiciona o peso do conteúdo atual e corta pra 20
  const next = [pesos[currentLabel], ...hist].slice(0, 20);

  return {
    historicoPesos: next,
    scoreGlobal: scoreFromHistorico(next),
  };
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

    // 1) Categoria: tenta IA, senão fallback local (mas SEMPRE em A/B/C/D)
    let category: "A" | "B" | "C" | "D" = "B";
    let summary = "Sem resumo.";
    let mode: "ai" | "local-fallback" = "ai";
    let modelUsed: string | undefined;

    try {
      const ai = await openrouterAnalyze({ url, domain: normalizeDomain(domain) });
      category = ai.category; // precisa ser A/B/C/D
      summary = ai.summary || summaryByLabel(category, "ai");
      modelUsed = ai.modelUsed;
      mode = "ai";
    } catch (e: any) {
      category = classificarABCD(domain);
      const msg = String(e?.message || e);
      summary = `${summaryByLabel(category, "local")} (IA indisponível: ${msg.slice(0, 80)})`;
      modelUsed = "fallback-local";
      mode = "local-fallback";
    }

    // 2) Score GLOBAL (igual extensão): média móvel dos últimos 20 pesos do usuário
    const { scoreGlobal } = await computeGlobalScoreForUser(req.userId, category);

    // 3) Salva no banco com score GLOBAL
    const analysis = await prisma.analysis.create({
      data: {
        url,
        domain: normalizeDomain(domain),
        category,          // A/B/C/D
        score: scoreGlobal, // ✅ score global/comportamental
        summary,
        text: summary,
        userId: req.userId,
      },
    });

    return res.json({
      analysis,
      modelUsed: modelUsed ?? "unknown",
      mode,
    });
  } catch (e: any) {
    console.error("analyzeController:", e?.stack || e);
    return res.status(500).json({ error: e?.message || "Erro ao analisar" });
  }
}