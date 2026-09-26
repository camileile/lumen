const assert = require("node:assert/strict");
const test = require("node:test");
const { loadExtensionScript } = require("./load-extension-script");

const contract = loadExtensionScript("score-contract.js", "LumenScoreContract");

test("extension exposes the rolling-weight-v1 contract", () => {
  assert.equal(contract.methodVersion, "rolling-weight-v1");
  assert.equal(contract.windowSize, 20);
  assert.deepEqual({ ...contract.categoryWeights }, { A: 3, B: 1, C: -2, D: -5 });
});

test("extension score handles empty and homogeneous histories", () => {
  assert.equal(contract.calculateScoreFromWeights([]), null);
  assert.equal(contract.calculateScoreFromWeights([3, 3]), 100);
  assert.equal(contract.calculateScoreFromWeights([1, 1]), 75);
  assert.equal(contract.calculateScoreFromWeights([-2, -2]), 38);
  assert.equal(contract.calculateScoreFromWeights([-5, -5]), 0);
});

test("extension score preserves rounding and mixed-category behavior", () => {
  assert.equal(contract.calculateScoreFromWeights([3, 1, -2, -5]), 53);
  assert.equal(contract.calculateScoreFromWeights([0]), 63);
});

test("extension score uses only the latest 20 finite observations", () => {
  assert.equal(contract.calculateScoreFromWeights([3, ...Array(20).fill(-5)]), 0);
  assert.equal(contract.calculateScoreFromWeights([-5, ...Array(20).fill(3)]), 100);
  assert.equal(contract.calculateScoreFromWeights([Number.NaN, 3]), 100);
});

test("extension score states preserve the canonical thresholds", () => {
  assert.equal(contract.scoreState(null).label, "Dados insuficientes");
  assert.equal(contract.scoreState(70).label, "Faixa alta");
  assert.equal(contract.scoreState(40).label, "Faixa intermediária");
  assert.equal(contract.scoreState(39).label, "Faixa baixa");
});
