import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTOMATED_ESTIMATE_COPY,
  mapHistoryToDashboard,
  NOT_ENOUGH_DATA_COPY,
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
  assert.equal(dashboard.trend.subtitle, NOT_ENOUGH_DATA_COPY);
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
    }),
  );

  assert.equal(dashboard.score, 37);
  assert.equal(dashboard.xp, 37);
  assert.equal(dashboard.statusLabel, "Faixa baixa");
  assert.deepEqual(dashboard.scoreSeries, [{ day: "01/09", value: 37 }]);
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
