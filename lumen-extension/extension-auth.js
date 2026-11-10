(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumenExtensionAuth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const keys = Object.freeze({
    installationId: "lumen_installation_id",
    accessToken: "lumen_extension_access_token",
    refreshToken: "lumen_extension_refresh_token",
    account: "lumen_extension_account",
    accessExpiresAt: "lumen_extension_access_expires_at",
    refreshExpiresAt: "lumen_extension_refresh_expires_at",
    pending: "lumen_extension_pending_authorization",
  });

  function base64Url(bytes) {
    let value = "";
    for (const byte of bytes) value += String.fromCharCode(byte);
    return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  async function createPkcePair(cryptoApi = crypto) {
    const random = new Uint8Array(32);
    cryptoApi.getRandomValues(random);
    const verifier = base64Url(random);
    const digest = await cryptoApi.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return { verifier, challenge: base64Url(new Uint8Array(digest)) };
  }

  async function ensureInstallationId(storageLocal, uuid = () => crypto.randomUUID()) {
    const stored = await storageLocal.get([keys.installationId]);
    if (typeof stored[keys.installationId] === "string") return stored[keys.installationId];
    const installationId = uuid();
    await storageLocal.set({ [keys.installationId]: installationId });
    return installationId;
  }

  async function createPendingConnection(storageSession, installationId, cryptoApi = crypto) {
    const { verifier, challenge } = await createPkcePair(cryptoApi);
    const pending = {
      requestId: cryptoApi.randomUUID().replaceAll("-", ""),
      installationId,
      verifier,
      codeChallenge: challenge,
      createdAt: Date.now(),
    };
    await storageSession.set({ [keys.pending]: pending });
    return pending;
  }

  async function configureTrustedStorage(storageLocal, storageSession) {
    await Promise.all([
      storageLocal?.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" }),
      storageSession?.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" }),
    ]);
  }

  async function storeSession(storageLocal, storageSession, session) {
    await storageLocal.set({
      [keys.refreshToken]: session.refreshToken,
      [keys.account]: session.user,
      [keys.refreshExpiresAt]: session.refreshExpiresAt,
    });
    await storageSession.set({
      [keys.accessToken]: session.accessToken,
      [keys.accessExpiresAt]: session.accessExpiresAt,
    });
    await storageLocal.remove(["lumen_token", "lumen_extension_token", "lumen_extension_expires_at"]);
  }

  async function clearSession(storageLocal, storageSession) {
    await storageLocal.remove([
      keys.refreshToken,
      keys.account,
      keys.refreshExpiresAt,
      "lumen_token",
      "lumen_extension_token",
      "lumen_extension_expires_at",
    ]);
    if (storageSession) {
      await storageSession.remove([keys.accessToken, keys.accessExpiresAt, keys.pending]);
    }
  }

  async function readSession(storageLocal, storageSession, now = Date.now()) {
    const [persistent, transient] = await Promise.all([
      storageLocal.get([keys.refreshToken, keys.account, keys.refreshExpiresAt]),
      storageSession.get([keys.accessToken, keys.accessExpiresAt]),
    ]);
    const refreshAvailable = typeof persistent[keys.refreshToken] === "string" &&
      typeof persistent[keys.refreshExpiresAt] === "number" && persistent[keys.refreshExpiresAt] > now;
    const connected = refreshAvailable && typeof transient[keys.accessToken] === "string" &&
      typeof transient[keys.accessExpiresAt] === "number" && transient[keys.accessExpiresAt] > now;
    if (!connected && transient[keys.accessToken]) {
      await storageSession.remove([keys.accessToken, keys.accessExpiresAt]);
    }
    if (!refreshAvailable && persistent[keys.refreshToken]) {
      await clearSession(storageLocal, storageSession);
    }
    return {
      connected,
      canRefresh: refreshAvailable,
      accessToken: connected ? transient[keys.accessToken] : null,
      refreshToken: refreshAvailable ? persistent[keys.refreshToken] : null,
      user: refreshAvailable && persistent[keys.account] ? persistent[keys.account] : null,
      accessExpiresAt: connected ? transient[keys.accessExpiresAt] : null,
      refreshExpiresAt: refreshAvailable ? persistent[keys.refreshExpiresAt] : null,
    };
  }

  return {
    keys,
    createPkcePair,
    ensureInstallationId,
    createPendingConnection,
    configureTrustedStorage,
    storeSession,
    clearSession,
    readSession,
  };
});
