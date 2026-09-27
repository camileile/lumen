(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumenHandshakePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const trustedDashboardOrigin = "http://localhost:3001";
  const challengeTtlMs = 60_000;
  const maxPendingChallenges = 128;

  function isTrustedOrigin(origin) {
    return origin === trustedDashboardOrigin;
  }

  function isValidNonce(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value);
  }

  function isValidToken(value) {
    return typeof value === "string" && value.length <= 8192 && /^[^.\s]+\.[^.\s]+\.[^.\s]+$/.test(value);
  }

  function createChallengeRegistry(now = Date.now) {
    const pending = new Map();
    return {
      issue(origin, challenge) {
        if (!isTrustedOrigin(origin) || !isValidNonce(challenge)) return false;
        for (const [key, item] of pending) {
          if (item.expiresAt <= now()) pending.delete(key);
        }
        if (pending.size >= maxPendingChallenges) pending.delete(pending.keys().next().value);
        pending.set(challenge, { origin, expiresAt: now() + challengeTtlMs });
        return true;
      },
      consume(origin, challenge) {
        const item = pending.get(challenge);
        if (!item) return false;
        if (item.expiresAt <= now()) {
          pending.delete(challenge);
          return false;
        }
        if (item.origin !== origin) return false;
        pending.delete(challenge);
        return true;
      },
    };
  }

  return {
    trustedDashboardOrigin,
    challengeTtlMs,
    maxPendingChallenges,
    isTrustedOrigin,
    isValidNonce,
    isValidToken,
    createChallengeRegistry,
  };
});
