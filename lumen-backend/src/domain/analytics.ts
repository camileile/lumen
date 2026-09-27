import type { ScoreHistoryPoint } from "./history";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKLY_ANALYTICS_LIMIT = 6;

export type WeeklyAveragePoint = {
  week: string;
  label: string;
  startDate: string;
  endDate: string;
  value: number;
  observedDays: number;
};

export type TrendDirection = "up" | "down" | "flat" | "insufficient";

export type TrendSummary = {
  direction: TrendDirection;
  delta: number | null;
  currentAverage: number | null;
  previousAverage: number | null;
};

function parseUtcDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function isoWeekStart(date: Date): number {
  const mondayIndex = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - mondayIndex * DAY_MS;
}

function isoWeekIdentity(startTimestamp: number) {
  const thursday = new Date(startTimestamp + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const firstMonday = isoWeekStart(januaryFourth);
  const weekNumber = Math.floor((startTimestamp - firstMonday) / (7 * DAY_MS)) + 1;
  return {
    week: `${isoYear}-W${String(weekNumber).padStart(2, "0")}`,
    label: `Semana ${weekNumber}`,
  };
}

export function calculateWeeklyAverages(
  points: readonly ScoreHistoryPoint[],
  limit = WEEKLY_ANALYTICS_LIMIT,
): WeeklyAveragePoint[] {
  const groups = new Map<number, number[]>();

  for (const point of points) {
    const date = parseUtcDay(point.date);
    if (!date || !Number.isFinite(point.value) || point.value < 0 || point.value > 100) continue;
    const start = isoWeekStart(date);
    const values = groups.get(start) ?? [];
    values.push(point.value);
    groups.set(start, values);
  }

  const weekly = Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([start, values]) => {
      const identity = isoWeekIdentity(start);
      return {
        ...identity,
        startDate: isoDate(start),
        endDate: isoDate(start + 6 * DAY_MS),
        value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        observedDays: values.length,
      };
    });

  return weekly.slice(-Math.max(1, limit));
}

export function calculateTrend(weekly: readonly WeeklyAveragePoint[]): TrendSummary {
  if (weekly.length < 2) {
    return { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null };
  }

  const current = weekly[weekly.length - 1];
  const previous = weekly[weekly.length - 2];
  const currentStart = parseUtcDay(current.startDate)?.getTime();
  const previousStart = parseUtcDay(previous.startDate)?.getTime();

  if (currentStart === undefined || previousStart === undefined ||
      currentStart - previousStart !== 7 * DAY_MS) {
    return { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null };
  }

  const delta = current.value - previous.value;
  return {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    delta,
    currentAverage: current.value,
    previousAverage: previous.value,
  };
}
