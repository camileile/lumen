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
    weeklyAverages: [],
    trend: { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null },
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

test("multiple observations on one day produce only the final real point", () => {
  const points = buildScoreHistory([
    { category: "D", createdAt: "2026-09-01T01:00:00.000Z" },
    { category: "A", createdAt: "2026-09-01T23:00:00.000Z" },
  ]);

  assert.deepEqual(points, [{ date: "2026-09-01", value: 50 }]);
});

test("UTC midnight separates observations into their real calendar days", () => {
  const points = buildScoreHistory([
    { category: "A", createdAt: "2026-09-01T23:59:59.999Z" },
    { category: "D", createdAt: "2026-09-02T00:00:00.000Z" },
  ]);

  assert.deepEqual(points, [
    { date: "2026-09-01", value: 100 },
    { date: "2026-09-02", value: 50 },
  ]);
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

test("weekly interval includes its exact seven-day UTC boundary", () => {
  assert.equal(
    calculateWeeklyAverage([
      { date: "2026-09-01", value: 10 },
      { date: "2026-09-02", value: 20 },
      { date: "2026-09-08", value: 80 },
    ]),
    50,
  );
});

test("history current score uses at most the latest 20 valid observations", () => {
  const observations = [
    { category: "D", createdAt: "2026-08-01T00:00:00.000Z" },
    ...Array.from({ length: 20 }, (_, index) => ({
      category: "A",
      createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    })),
  ];

  assert.equal(buildHistoryMetrics(observations).currentScore, 100);
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
