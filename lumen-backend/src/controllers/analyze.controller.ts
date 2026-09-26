// src/controllers/analyze.controller.ts
import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";
import { openrouterAnalyze } from "../ai/openrouter";
import {
  calculateScore,
  Category,
  normalizeCategory,
  SCORE_METHOD_VERSION,
  SCORE_WINDOW_SIZE,
} from "../domain/score";
import { classifyHostname } from "../domain/source-classifier";
import { sanitizeAnalysisUrl } from "../security/analysis-url";
import { AppError } from "../security/app-error";

const AUTOMATED_ESTIMATE_NOTICE =
  "Estimativa automatizada baseada principalmente no domínio; não é checagem factual.";

function summaryByLabel(label: Category, source: "ai" | "local", knownSource = true) {
  if (!knownSource) {
    return `Fonte não reconhecida pela lista local; evidência insuficiente. ${AUTOMATED_ESTIMATE_NOTICE}`;
  }

  const base =
    label === "A"
      ? "Sinais compatíveis com uma fonte de referência"
      : label === "B"
      ? "Sinais neutros ou institucionais"
      : label === "C"
      ? "Sinais associados a uma abordagem sensacionalista"
      : "Sinais de risco associados à fonte";

  return `${base} (${source === "ai" ? "IA" : "lista local"}). ${AUTOMATED_ESTIMATE_NOTICE}`;
}

async function computeGlobalScoreForUser(userId: string, currentLabel: Category) {
  const last = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { category: true },
  });

  const history = last
    .map((analysis) => normalizeCategory(analysis.category))
    .filter((category): category is Category => category !== null)
    .slice(0, SCORE_WINDOW_SIZE - 1)
    .reverse();

  const scoreGlobal = calculateScore([...history, currentLabel]);
  if (scoreGlobal === null) throw new Error("Não foi possível calcular o score");

  return scoreGlobal;
}

export async function analyzeController(req: AuthedRequest, res: Response) {
    const { url: rawUrl } = req.body as { url?: unknown };
    if (!req.userId) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Não autenticado");

    const { url, hostname: domain } = sanitizeAnalysisUrl(rawUrl);
    const configuredDuplicateWindow = Number(process.env.ANALYZE_DUPLICATE_WINDOW_SECONDS);
    const duplicateWindowSeconds = Number.isSafeInteger(configuredDuplicateWindow) && configuredDuplicateWindow > 0
      ? configuredDuplicateWindow
      : 30;
    const duplicateSince = new Date(Date.now() - Math.max(1, duplicateWindowSeconds) * 1000);
    const duplicate = await prisma.analysis.findFirst({
      where: { userId: req.userId, url, createdAt: { gte: duplicateSince } },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(429, "DUPLICATE_ANALYSIS", "Esta URL foi analisada recentemente");
    }

    // 1) Categoria: tenta IA, senão fallback local (mas SEMPRE em A/B/C/D)
    let category: Category;
    let summary: string;
    let mode: "ai" | "local-fallback";
    let modelUsed: string | undefined;

    try {
      const ai = await openrouterAnalyze({ url, domain });
      category = ai.category;
      // The provider's numeric score is intentionally not persisted or exposed. The category is
      // the only AI input to the canonical rolling-weight-v1 behavioral score.
      summary = ai.summary
        ? `${ai.summary} ${AUTOMATED_ESTIMATE_NOTICE}`
        : summaryByLabel(category, "ai");
      modelUsed = ai.modelUsed;
      mode = "ai";
    } catch {
      const fallback = classifyHostname(domain);
      category = fallback.category;
      summary = `${summaryByLabel(category, "local", fallback.knownSource)} Análise remota indisponível.`;
      modelUsed = "fallback-local";
      mode = "local-fallback";
    }

    const scoreGlobal = await computeGlobalScoreForUser(req.userId, category);

    // 3) Salva no banco com score GLOBAL
    const analysis = await prisma.analysis.create({
      data: {
        url,
        domain,
        category,
        score: scoreGlobal,
        summary,
        text: summary,
        userId: req.userId,
      },
      select: {
        id: true,
        url: true,
        domain: true,
        category: true,
        score: true,
        summary: true,
        createdAt: true,
      },
    });

    return res.json({
      analysis,
      modelUsed: modelUsed ?? "unknown",
      mode,
      methodology: {
        version: SCORE_METHOD_VERSION,
        observationWindow: SCORE_WINDOW_SIZE,
        basis: "source-domain-category-history",
      },
    });
}
