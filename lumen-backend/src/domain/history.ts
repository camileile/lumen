import {
  calculateScore,
  Category,
  normalizeCategory,
  SCORE_WINDOW_SIZE,
} from "./score";
import { calculateTrend, calculateWeeklyAverages, type TrendSummary, type WeeklyAveragePoint } from "./analytics";

export type DatedCategoryObservation = {
  category: unknown;
  createdAt: Date | string;
};

export type ScoreHistoryPoint = {
  date: string;
  value: number;
};

export type HistoryMetrics = {
  categories: Category[];
  currentScore: number | null;
  scoreHistory: ScoreHistoryPoint[];
  weeklyAverage: number | null;
  weeklyAverages: WeeklyAveragePoint[];
  trend: TrendSummary;
};

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseObservation(observation: DatedCategoryObservation) {
  const category = normalizeCategory(observation.category);
  const createdAt = new Date(observation.createdAt);

  if (!category || Number.isNaN(createdAt.getTime())) return null;
  return { category, createdAt };
}

function validObservations(observations: readonly DatedCategoryObservation[]) {
  return observations
    .map(parseObservation)
    .filter((observation): observation is NonNullable<typeof observation> => observation !== null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function buildScoreHistory(
  observations: readonly DatedCategoryObservation[],
): ScoreHistoryPoint[] {
  const valid = validObservations(observations);

  const rollingCategories: Category[] = [];
  const pointsByDay = new Map<string, number>();

  for (const observation of valid) {
    rollingCategories.push(observation.category);
    if (rollingCategories.length > SCORE_WINDOW_SIZE) rollingCategories.shift();

    const score = calculateScore(rollingCategories);
    if (score !== null) pointsByDay.set(utcDayKey(observation.createdAt), score);
  }

  return Array.from(pointsByDay, ([date, value]) => ({ date, value }));
}

export function calculateWeeklyAverage(points: readonly ScoreHistoryPoint[]): number | null {
  if (points.length === 0) return null;

  const latestTimestamp = Date.parse(`${points[points.length - 1].date}T00:00:00.000Z`);
  if (Number.isNaN(latestTimestamp)) return null;

  const firstTimestamp = latestTimestamp - 6 * 24 * 60 * 60 * 1000;
  const weeklyPoints = points.filter((point) => {
    const timestamp = Date.parse(`${point.date}T00:00:00.000Z`);
    return !Number.isNaN(timestamp) && timestamp >= firstTimestamp && timestamp <= latestTimestamp;
  });

  if (weeklyPoints.length === 0) return null;

  return Math.round(
    weeklyPoints.reduce((total, point) => total + point.value, 0) / weeklyPoints.length,
  );
}

export function buildHistoryMetrics(
  observations: readonly DatedCategoryObservation[],
): HistoryMetrics {
  const categories = validObservations(observations).map((observation) => observation.category);

  const scoreHistory = buildScoreHistory(observations);
  const weeklyAverages = calculateWeeklyAverages(scoreHistory);

  return {
    categories,
    currentScore: calculateScore(categories),
    scoreHistory,
    weeklyAverage: calculateWeeklyAverage(scoreHistory),
    weeklyAverages,
    trend: calculateTrend(weeklyAverages),
  };
}
