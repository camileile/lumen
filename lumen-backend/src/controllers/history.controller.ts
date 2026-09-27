import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";
import { buildHistoryMetrics } from "../domain/history";
import {
  Category,
  classifyScore,
  normalizeCategory,
  SCORE_METHOD_VERSION,
  SCORE_WINDOW_SIZE,
} from "../domain/score";

function distributionFromCategories(categories: readonly Category[]) {
  const counts: Record<Category, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const category of categories.slice(-SCORE_WINDOW_SIZE)) counts[category]++;

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const percentage = (category: Category) =>
    total === 0 ? 0 : Math.round((counts[category] / total) * 100);

  return {
    counts,
    distribution: {
      confiavel: percentage("A"),
      neutro: percentage("B"),
      sensacionalista: percentage("C"),
      desinformacao: percentage("D"),
    },
  };
}

function userFacingSummary(score: number | null, counts: Record<Category, number>) {
  const band = classifyScore(score);

  if (!band) {
    return {
      status: "insufficient-data",
      insight: "Dados insuficientes. O Lumen ainda não possui observações válidas para calcular uma estimativa.",
    };
  }

  if (counts.B > 0) {
    return {
      status: band,
      insight:
        "A janela inclui fontes neutras ou desconhecidas. A faixa numérica não comprova confiabilidade nem substitui checagem factual.",
    };
  }

  return {
    status: band,
    insight:
      "Estimativa automatizada baseada principalmente em categorias de fonte/domínio; não é uma checagem factual.",
  };
}

export async function getHistory(req: AuthedRequest, res: Response) {
    if (!req.userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const [latestItems, observations] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          url: true,
          domain: true,
          category: true,
          score: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.analysis.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "asc" },
        select: { category: true, createdAt: true },
      }),
    ]);

    const items = latestItems.flatMap((analysis) => {
      const label = normalizeCategory(analysis.category);
      return label ? [{ ...analysis, label }] : [];
    });

    const metrics = buildHistoryMetrics(observations);
    const { counts, distribution } = distributionFromCategories(metrics.categories);
    const presentation = userFacingSummary(metrics.currentScore, counts);

    return res.json({
      items,
      score: metrics.currentScore,
      status: presentation.status,
      distribution,
      weeklyAverage: metrics.weeklyAverage,
      scoreHistory: metrics.scoreHistory,
      insight: presentation.insight,
      methodology: {
        version: SCORE_METHOD_VERSION,
        observationWindow: SCORE_WINDOW_SIZE,
        basis: "source-domain-category-history",
      },
    });
}
