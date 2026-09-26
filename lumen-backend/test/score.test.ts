import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateScore,
  calculateScoreFromAverageWeight,
  CATEGORY_WEIGHTS,
  classifyScore,
  normalizeCategory,
  SCORE_THRESHOLDS,
  SCORE_METHOD_VERSION,
  SCORE_WINDOW_SIZE,
} from "../src/domain/score";

test("score contract remains rolling-weight-v1", () => {
  assert.equal(SCORE_METHOD_VERSION, "rolling-weight-v1");
});

test("empty history has no score", () => {
  assert.equal(calculateScore([]), null);
});

test("homogeneous category histories use the canonical weights", () => {
  assert.deepEqual(CATEGORY_WEIGHTS, { A: 3, B: 1, C: -2, D: -5 });
  assert.equal(calculateScore(["A", "A"]), 100);
  assert.equal(calculateScore(["B", "B"]), 75);
  assert.equal(calculateScore(["C", "C"]), 38);
  assert.equal(calculateScore(["D", "D"]), 0);
});

test("mixed categories use one linear transformation", () => {
  assert.equal(calculateScore(["A", "B", "C", "D"]), 53);
});

test("the transformed score is rounded to the nearest integer", () => {
  assert.equal(calculateScoreFromAverageWeight(0), 63);
});

test("the transformed score is clamped to 0 through 100", () => {
  assert.equal(calculateScoreFromAverageWeight(-100), 0);
  assert.equal(calculateScoreFromAverageWeight(100), 100);
});

test("only the latest 20 valid observations affect the score", () => {
  assert.equal(SCORE_WINDOW_SIZE, 20);
  assert.equal(calculateScore(["A", ...Array(20).fill("D")]), 0);
  assert.equal(calculateScore(["D", ...Array(20).fill("A")]), 100);
});

test("legacy categories normalize while invalid values remain unavailable", () => {
  assert.equal(normalizeCategory("confiavel"), "A");
  assert.equal(normalizeCategory("desconhecido"), "B");
  assert.equal(normalizeCategory("sensacionalista"), "C");
  assert.equal(normalizeCategory("desinformacao"), "D");
  assert.equal(normalizeCategory("legacy-unknown"), null);
  assert.equal(calculateScore(["legacy-unknown", "A"]), 100);
});

test("score bands preserve the existing 70 and 40 thresholds", () => {
  assert.deepEqual(SCORE_THRESHOLDS, { higherSignal: 70, mixedSignal: 40 });
  assert.equal(classifyScore(null), null);
  assert.equal(classifyScore(70), "higher-signal");
  assert.equal(classifyScore(40), "mixed-signal");
  assert.equal(classifyScore(39), "lower-signal");
});
