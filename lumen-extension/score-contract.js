// rolling-weight-v1 mirrors lumen-backend/src/domain/score.ts.
// Keep this dependency-free until the extension adopts a shared build artifact.
(function registerLumenScoreContract(global) {
  const CATEGORY_WEIGHTS = Object.freeze({ A: 3, B: 1, C: -2, D: -5 });
  const WINDOW_SIZE = 20;
  const THRESHOLDS = Object.freeze({ higherSignal: 70, mixedSignal: 40 });

  function calculateScoreFromWeights(weights) {
    const valid = weights.filter((weight) => Number.isFinite(weight)).slice(-WINDOW_SIZE);
    if (valid.length === 0) return null;

    const average = valid.reduce((total, weight) => total + weight, 0) / valid.length;
    return Math.max(0, Math.min(100, Math.round(((average + 5) / 8) * 100)));
  }

  function scoreState(score) {
    if (typeof score !== "number" || !Number.isFinite(score)) {
      return { key: "amarelo", label: "Dados insuficientes" };
    }

    if (score >= THRESHOLDS.higherSignal) return { key: "verde", label: "Faixa alta" };
    if (score >= THRESHOLDS.mixedSignal) return { key: "amarelo", label: "Faixa intermediária" };
    return { key: "vermelho", label: "Faixa baixa" };
  }

  global.LumenScoreContract = Object.freeze({
    methodVersion: "rolling-weight-v1",
    categoryWeights: CATEGORY_WEIGHTS,
    windowSize: WINDOW_SIZE,
    thresholds: THRESHOLDS,
    calculateScoreFromWeights,
    scoreState,
  });
})(globalThis);
