const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createNavigationTracker,
  localAnalysisKeys,
  shouldAutomaticallyObserve,
  updatedTabUrl,
} = require("../observation-policy.js");

test("automatic observation is opt-in and limited to recognized sources", () => {
  assert.equal(shouldAutomaticallyObserve(false, { knownSource: true }), false);
  assert.equal(shouldAutomaticallyObserve(undefined, { knownSource: true }), false);
  assert.equal(shouldAutomaticallyObserve(true, { knownSource: false }), false);
  assert.equal(shouldAutomaticallyObserve(true, { knownSource: true }), true);
});

test("one tab update produces at most one candidate URL", () => {
  assert.equal(
    updatedTabUrl({ status: "complete", url: "https://bbc.com/new" }, { url: "https://bbc.com/old" }),
    "https://bbc.com/new",
  );
  assert.equal(updatedTabUrl({ status: "complete" }, { url: "https://bbc.com/article" }), "https://bbc.com/article");
  assert.equal(updatedTabUrl({ status: "loading" }, { url: "https://bbc.com/article" }), null);
});

test("navigation tracking prevents duplicate observations and stale responses", () => {
  const tracker = createNavigationTracker();
  const firstGeneration = tracker.begin(7, "https://bbc.com/article-1");
  assert.equal(firstGeneration, 1);
  assert.equal(tracker.begin(7, "https://bbc.com/article-1"), null);
  assert.equal(tracker.isCurrent(7, "https://bbc.com/article-1", firstGeneration), true);

  const secondGeneration = tracker.begin(7, "https://bbc.com/article-2");
  assert.equal(secondGeneration, 2);
  assert.equal(tracker.isCurrent(7, "https://bbc.com/article-1", firstGeneration), false);
  assert.equal(tracker.isCurrent(7, "https://bbc.com/article-2", secondGeneration), true);

  assert.equal(tracker.begin(8, "https://bbc.com/article-2"), 1);
  tracker.clear(7);
  assert.equal(tracker.begin(7, "https://bbc.com/article-2"), 1);
  tracker.clearAll();
  assert.equal(tracker.begin(8, "https://bbc.com/article-2"), 1);
});

test("local analysis cleanup does not remove account or preference state", () => {
  assert.ok(localAnalysisKeys.includes("historico"));
  assert.ok(localAnalysisKeys.includes("lastUrl"));
  assert.equal(localAnalysisKeys.includes("lumen_extension_token"), false);
  assert.equal(localAnalysisKeys.includes("lumen_installation_id"), false);
  assert.equal(localAnalysisKeys.includes("automaticObservationEnabled"), false);
  assert.equal(localAnalysisKeys.includes("overlayAtivo"), false);
});
