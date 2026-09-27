(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumenPrivacyUrl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const privateKeys = new Set([
    "accesstoken", "apikey", "auth", "authorization", "code", "cookie", "credential",
    "idtoken", "jwt", "key", "nonce", "pass", "password", "refreshtoken", "samlresponse",
    "secret", "session", "sessionid", "sessiontoken", "sig", "signature", "state", "ticket", "token",
  ]);
  const trackingKey = /^(?:utm_.+|fbclid|gclid|dclid|mc_[ce]id|ref_src)$/i;

  function sanitizeForAnalysis(value) {
    try {
      if (typeof value !== "string" || value.length > 2048) return null;
      const parsed = new URL(value);
      if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) return null;
      parsed.hash = "";
      for (const key of [...parsed.searchParams.keys()]) {
        const canonicalKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        const queryValue = parsed.searchParams.get(key) ?? "";
        const sensitiveValue = /^(?:bearer\s+|sk-)/i.test(queryValue) || /^[^.\s]+\.[^.\s]+\.[^.\s]+$/.test(queryValue);
        if (privateKeys.has(canonicalKey) || trackingKey.test(key) || sensitiveValue) parsed.searchParams.delete(key);
      }
      parsed.searchParams.sort();
      return parsed.toString();
    } catch {
      return null;
    }
  }

  return { sanitizeForAnalysis };
});
