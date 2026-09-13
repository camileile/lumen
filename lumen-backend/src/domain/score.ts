export const SCORE_METHOD_VERSION = "rolling-weight-v1";

export const CATEGORY_WEIGHTS = {
  A: 3,
  B: 1,
  C: -2,
  D: -5,
} as const;

export type Category = keyof typeof CATEGORY_WEIGHTS;

export const SCORE_WINDOW_SIZE = 20;

export const SCORE_THRESHOLDS = {
  higherSignal: 70,
  mixedSignal: 40,
} as const;

export type ScoreBand = "higher-signal" | "mixed-signal" | "lower-signal";

const LEGACY_CATEGORIES: Record<string, Category> = {
  confiavel: "A",
  neutro: "B",
  desconhecido: "B",
  sensacionalista: "C",
  desinformacao: "D",
};

export function normalizeCategory(value: unknown): Category | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  const canonical = normalized.toUpperCase();
  if (canonical === "A" || canonical === "B" || canonical === "C" || canonical === "D") {
    return canonical;
  }

  return LEGACY_CATEGORIES[normalized.toLowerCase()] ?? null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function calculateScoreFromAverageWeight(averageWeight: number): number | null {
  if (!Number.isFinite(averageWeight)) return null;
  return clampScore(Math.round(((averageWeight + 5) / 8) * 100));
}

/**
 * Calculates the rolling-weight-v1 score from observations ordered oldest to newest.
 * Invalid legacy values are excluded before the latest 20 valid observations are selected.
 */
export function calculateScore(observations: readonly unknown[]): number | null {
  const categories = observations
    .map(normalizeCategory)
    .filter((category): category is Category => category !== null)
    .slice(-SCORE_WINDOW_SIZE);

  if (categories.length === 0) return null;

  const weightTotal = categories.reduce(
    (total, category) => total + CATEGORY_WEIGHTS[category],
    0,
  );

  return calculateScoreFromAverageWeight(weightTotal / categories.length);
}

export function classifyScore(score: number | null): ScoreBand | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= SCORE_THRESHOLDS.higherSignal) return "higher-signal";
  if (score >= SCORE_THRESHOLDS.mixedSignal) return "mixed-signal";
  return "lower-signal";
}
