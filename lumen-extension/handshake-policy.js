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

  function isTrustedDashboardUrl(value, pathname) {
    try {
      const url = new URL(value);
      return isTrustedOrigin(url.origin) && url.pathname === pathname && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  function isValidNonce(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value);
  }

  function isValidInstallationId(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function isValidPkceChallenge(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
  }

  function isValidAuthorizationCode(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value);
  }

  function sameContext(left, right) {
    return left && right && left.requestId === right.requestId &&
      left.installationId === right.installationId && left.codeChallenge === right.codeChallenge;
  }

  function createChallengeRegistry(now = Date.now) {
    const pending = new Map();
    return {
      issue(origin, challenge, context) {
        if (!isTrustedOrigin(origin) || !isValidNonce(challenge) ||
            !isValidNonce(context?.requestId) || !isValidInstallationId(context?.installationId) ||
            !isValidPkceChallenge(context?.codeChallenge)) return false;
        for (const [key, item] of pending) {
          if (item.expiresAt <= now()) pending.delete(key);
        }
        if (pending.size >= maxPendingChallenges) pending.delete(pending.keys().next().value);
        pending.set(challenge, { origin, context, expiresAt: now() + challengeTtlMs });
        return true;
      },
      consume(origin, challenge, context) {
        const item = pending.get(challenge);
        if (!item) return false;
        if (item.expiresAt <= now()) {
          pending.delete(challenge);
          return false;
        }
        if (item.origin !== origin || !sameContext(item.context, context)) return false;
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
    isTrustedDashboardUrl,
    isValidNonce,
    isValidInstallationId,
    isValidPkceChallenge,
    isValidAuthorizationCode,
    createChallengeRegistry,
  };
});
