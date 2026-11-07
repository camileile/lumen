import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTOMATED_ESTIMATE_COPY,
  mapHistoryToDashboard,
} from "../src/app/lib/dashboardData";
import type { HistoryResponse } from "../src/app/lib/types";

function historyResponse(overrides: Partial<HistoryResponse> = {}): HistoryResponse {
  return {
    items: [],
    score: null,
    status: "insufficient-data",
    distribution: { confiavel: 0, neutro: 0, sensacionalista: 0, desinformacao: 0 },
    weeklyAverage: null,
    scoreHistory: [],
    weeklyAverages: [],
    trend: { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null },
    insight: "Dados insuficientes.",
    methodology: {
      version: "rolling-weight-v1",
      observationWindow: 20,
      basis: "source-domain-category-history",
    },
    ...overrides,
  };
}

test("maps empty history and null weekly average to honest empty state data", () => {
  const dashboard = mapHistoryToDashboard(historyResponse());

  assert.equal(dashboard.score, null);
  assert.equal(dashboard.weeklyAverage, null);
  assert.equal(dashboard.statusLabel, "Dados insuficientes");
  assert.deepEqual(dashboard.scoreSeries, []);
  assert.deepEqual(dashboard.weeklySeries, []);
  assert.deepEqual(dashboard.distribution, []);
  assert.equal(dashboard.trend.direction, "insufficient");
});

test("uses the API score directly without a frontend scoring formula", () => {
  const dashboard = mapHistoryToDashboard(
    historyResponse({
      items: [{ id: "analysis-1", url: "https://example.com/article", label: "A" }],
      score: 37,
      status: "lower-signal",
      distribution: { confiavel: 100, neutro: 0, sensacionalista: 0, desinformacao: 0 },
      weeklyAverage: 37,
      scoreHistory: [{ date: "2026-09-01", value: 37 }],
      weeklyAverages: [{ week: "2026-W36", label: "Semana 36", startDate: "2026-08-31", endDate: "2026-09-06", value: 37, observedDays: 1 }],
    }),
  );

  assert.equal(dashboard.score, 37);
  assert.equal(dashboard.xp, 37);
  assert.equal(dashboard.statusLabel, "Faixa baixa");
  assert.deepEqual(dashboard.scoreSeries, [{ day: "01/09", value: 37 }]);
  assert.deepEqual(dashboard.weeklySeries, [{ day: "Semana 36", value: 37, observedDays: 1 }]);
  assert.equal(dashboard.weeklyAverage, 37);
});

test("presents weekly analytics and trend exactly as returned by the API", () => {
  const dashboard = mapHistoryToDashboard(historyResponse({
    weeklyAverages: [
      { week: "2026-W36", label: "Semana 36", startDate: "2026-08-31", endDate: "2026-09-06", value: 71, observedDays: 2 },
      { week: "2026-W37", label: "Semana 37", startDate: "2026-09-07", endDate: "2026-09-13", value: 75, observedDays: 1 },
    ],
    trend: { direction: "up", delta: 4, currentAverage: 75, previousAverage: 71 },
  }));

  assert.deepEqual(dashboard.weeklySeries.map(({ day, value }) => ({ day, value })), [
    { day: "Semana 36", value: 71 },
    { day: "Semana 37", value: 75 },
  ]);
  assert.deepEqual(dashboard.trend, { direction: "up", delta: 4, currentAverage: 75, previousAverage: 71 });
});

test("maps the API distribution without reinterpreting its values", () => {
  const dashboard = mapHistoryToDashboard(
    historyResponse({
      items: [{ id: "analysis-1", url: "https://example.com/article", label: "B" }],
      distribution: { confiavel: 10, neutro: 20, sensacionalista: 30, desinformacao: 40 },
    }),
  );

  assert.deepEqual(
    dashboard.distribution.map(({ value }) => value),
    [10, 20, 30, 40],
  );
});

test("keeps the automated-estimate disclaimer explicit", () => {
  assert.match(AUTOMATED_ESTIMATE_COPY, /Estimativa automatizada/i);
  assert.match(AUTOMATED_ESTIMATE_COPY, /Não é uma checagem factual/i);
});
