import assert from "node:assert/strict";
import test from "node:test";
import { calculateTrend, calculateWeeklyAverages } from "../src/domain/analytics";

test("one ISO week uses only its observed UTC days", () => {
  assert.deepEqual(calculateWeeklyAverages([
    { date: "2026-09-07", value: 60 },
    { date: "2026-09-13", value: 80 },
  ]), [{
    week: "2026-W37",
    label: "Semana 37",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    value: 70,
    observedDays: 2,
  }]);
});

test("UTC Sunday and Monday belong to different ISO weeks", () => {
  const weekly = calculateWeeklyAverages([
    { date: "2026-09-13", value: 40 },
    { date: "2026-09-14", value: 80 },
  ]);
  assert.deepEqual(weekly.map((point) => point.week), ["2026-W37", "2026-W38"]);
});

test("partial weeks remain real single-observation averages", () => {
  const weekly = calculateWeeklyAverages([{ date: "2026-09-16", value: 73 }]);
  assert.equal(weekly[0].value, 73);
  assert.equal(weekly[0].observedDays, 1);
});

test("multiple weeks are ordered and limited without fabricating gaps", () => {
  const weekly = calculateWeeklyAverages([
    { date: "2026-07-06", value: 10 },
    { date: "2026-07-20", value: 20 },
    { date: "2026-08-03", value: 30 },
    { date: "2026-08-17", value: 40 },
    { date: "2026-08-31", value: 50 },
    { date: "2026-09-14", value: 60 },
    { date: "2026-09-28", value: 70 },
  ]);

  assert.equal(weekly.length, 6);
  assert.deepEqual(weekly.map((point) => point.startDate), [
    "2026-07-20", "2026-08-03", "2026-08-17", "2026-08-31", "2026-09-14", "2026-09-28",
  ]);
});

test("positive, negative, and zero deltas have exact directions", () => {
  const base = {
    week: "2026-W37",
    label: "Semana 37",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    observedDays: 2,
  };
  const next = { ...base, week: "2026-W38", label: "Semana 38", startDate: "2026-09-14", endDate: "2026-09-20" };

  assert.deepEqual(calculateTrend([{ ...base, value: 71 }, { ...next, value: 75 }]), {
    direction: "up", delta: 4, currentAverage: 75, previousAverage: 71,
  });
  assert.deepEqual(calculateTrend([{ ...base, value: 75 }, { ...next, value: 72 }]), {
    direction: "down", delta: -3, currentAverage: 72, previousAverage: 75,
  });
  assert.deepEqual(calculateTrend([{ ...base, value: 72 }, { ...next, value: 72 }]), {
    direction: "flat", delta: 0, currentAverage: 72, previousAverage: 72,
  });
});

test("trend is unavailable with fewer than two comparable adjacent weeks", () => {
  const one = calculateWeeklyAverages([{ date: "2026-09-07", value: 70 }]);
  const gap = calculateWeeklyAverages([
    { date: "2026-09-07", value: 70 },
    { date: "2026-09-28", value: 80 },
  ]);

  const insufficient = { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null };
  assert.deepEqual(calculateTrend([]), insufficient);
  assert.deepEqual(calculateTrend(one), insufficient);
  assert.deepEqual(calculateTrend(gap), insufficient);
});

test("invalid dates and values never create weekly data", () => {
  assert.deepEqual(calculateWeeklyAverages([
    { date: "invalid", value: 80 },
    { date: "2026-02-30", value: 80 },
    { date: "2026-09-07", value: Number.NaN },
    { date: "2026-09-08", value: 101 },
  ]), []);
});
