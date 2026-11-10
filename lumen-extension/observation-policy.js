(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumenObservationPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const automaticObservationKey = "automaticObservationEnabled";
  const localAnalysisKeys = Object.freeze([
    "historico", "score", "category", "summary", "domain", "lastUrl", "lastMode", "lastUpdatedAt", "modelUsed",
  ]);

  function shouldAutomaticallyObserve(enabled, classification) {
    return enabled === true && classification?.knownSource === true;
  }

  function updatedTabUrl(changeInfo, tab) {
    if (typeof changeInfo?.url === "string") return changeInfo.url;
    if (changeInfo?.status === "complete" && typeof tab?.url === "string") return tab.url;
    return null;
  }

  function createNavigationTracker() {
    const processedUrlByTab = new Map();
    const generationByTab = new Map();

    function begin(tabId, url) {
      if (processedUrlByTab.get(tabId) === url) return null;
      processedUrlByTab.set(tabId, url);
      const generation = (generationByTab.get(tabId) || 0) + 1;
      generationByTab.set(tabId, generation);
      return generation;
    }

    function isCurrent(tabId, url, generation) {
      return processedUrlByTab.get(tabId) === url && generationByTab.get(tabId) === generation;
    }

    function clear(tabId) {
      processedUrlByTab.delete(tabId);
      generationByTab.delete(tabId);
    }

    function clearAll() {
      processedUrlByTab.clear();
      generationByTab.clear();
    }

    return Object.freeze({ begin, isCurrent, clear, clearAll });
  }

  return Object.freeze({
    automaticObservationKey,
    localAnalysisKeys,
    shouldAutomaticallyObserve,
    updatedTabUrl,
    createNavigationTracker,
  });
});
