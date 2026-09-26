// Keep these source lists aligned with lumen-backend/src/domain/source-classifier.ts.
(function registerLumenDomainClassifier(global) {
  const sourceCategories = Object.freeze({
    A: Object.freeze(["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"]),
    B: Object.freeze(["gov.br", "un.org", "who.int", "ibge.gov.br"]),
    C: Object.freeze(["metropoles.com", "r7.com", "terra.com.br"]),
    D: Object.freeze(["infowars.com", "naturalnews.com"]),
  });

  function normalizeHostname(hostname) {
    return String(hostname).trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  }

  function hostnameFromHttpUrl(value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

      const hostname = normalizeHostname(parsed.hostname);
      return hostname || null;
    } catch {
      return null;
    }
  }

  function matchesSource(hostname, source) {
    return hostname === source || hostname.endsWith(`.${source}`);
  }

  function classifyHostname(hostname) {
    const normalized = normalizeHostname(hostname);

    for (const category of ["A", "B", "C", "D"]) {
      if (sourceCategories[category].some((source) => matchesSource(normalized, source))) {
        return { category, knownSource: true };
      }
    }

    return { category: "B", knownSource: false };
  }

  function classifyUrl(value) {
    const hostname = hostnameFromHttpUrl(value);
    if (!hostname) return null;
    return { ...classifyHostname(hostname), hostname };
  }

  global.LumenDomainClassifier = Object.freeze({
    normalizeHostname,
    hostnameFromHttpUrl,
    classifyHostname,
    classifyUrl,
  });
})(globalThis);
