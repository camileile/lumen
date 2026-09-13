import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHistoryMetrics,
  buildScoreHistory,
  calculateWeeklyAverage,
} from "../src/domain/history";

test("history is empty and weekly average is null without observations", () => {
  assert.deepEqual(buildHistoryMetrics([]), {
    categories: [],
    currentScore: null,
    scoreHistory: [],
    weeklyAverage: null,
  });
});

test("a single day produces one point from real timestamps", () => {
  const metrics = buildHistoryMetrics([
    { category: "A", createdAt: "2026-09-01T08:00:00.000Z" },
    { category: "B", createdAt: "2026-09-01T20:00:00.000Z" },
  ]);

  assert.deepEqual(metrics.scoreHistory, [{ date: "2026-09-01", value: 88 }]);
  assert.equal(metrics.currentScore, 88);
  assert.equal(metrics.weeklyAverage, 88);
});

test("multiple days use the canonical rolling score at the end of each observed day", () => {
  const points = buildScoreHistory([
    { category: "D", createdAt: "2026-09-03T09:00:00.000Z" },
    { category: "A", createdAt: "2026-09-01T09:00:00.000Z" },
    { category: "B", createdAt: "2026-09-02T09:00:00.000Z" },
  ]);

  assert.deepEqual(points, [
    { date: "2026-09-01", value: 100 },
    { date: "2026-09-02", value: 88 },
    { date: "2026-09-03", value: 58 },
  ]);
});

test("days without observations are never fabricated or interpolated", () => {
  const points = buildScoreHistory([
    { category: "A", createdAt: "2026-09-01T09:00:00.000Z" },
    { category: "B", createdAt: "2026-09-05T09:00:00.000Z" },
  ]);

  assert.deepEqual(points.map((point) => point.date), ["2026-09-01", "2026-09-05"]);
});

test("weekly average includes only observed days in the trailing seven-day period", () => {
  assert.equal(
    calculateWeeklyAverage([
      { date: "2026-09-01", value: 10 },
      { date: "2026-09-05", value: 50 },
      { date: "2026-09-08", value: 90 },
    ]),
    70,
  );
});

test("invalid categories and timestamps do not become synthetic observations", () => {
  const metrics = buildHistoryMetrics([
    { category: "not-a-category", createdAt: "2026-09-01T09:00:00.000Z" },
    { category: "A", createdAt: "not-a-date" },
  ]);

  assert.deepEqual(metrics.scoreHistory, []);
  assert.equal(metrics.currentScore, null);
  assert.equal(metrics.weeklyAverage, null);
});
