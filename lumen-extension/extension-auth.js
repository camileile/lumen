(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumenExtensionAuth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const keys = Object.freeze({
    installationId: "lumen_installation_id",
    token: "lumen_extension_token",
    account: "lumen_extension_account",
    expiresAt: "lumen_extension_expires_at",
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

  async function storeSession(storageLocal, session) {
    await storageLocal.set({
      [keys.token]: session.token,
      [keys.account]: session.user,
      [keys.expiresAt]: session.expiresAt,
    });
    await storageLocal.remove(["lumen_token"]);
  }

  async function clearSession(storageLocal, storageSession) {
    await storageLocal.remove([keys.token, keys.account, keys.expiresAt, "lumen_token"]);
    if (storageSession) await storageSession.remove([keys.pending]);
  }

  async function readSession(storageLocal, now = Date.now()) {
    const stored = await storageLocal.get([keys.token, keys.account, keys.expiresAt]);
    const connected = typeof stored[keys.token] === "string" &&
      typeof stored[keys.expiresAt] === "number" && stored[keys.expiresAt] > now;
    if (!connected && stored[keys.token]) {
      await storageLocal.remove([keys.token, keys.account, keys.expiresAt]);
    }
    return {
      connected,
      token: connected ? stored[keys.token] : null,
      user: connected && stored[keys.account] ? stored[keys.account] : null,
      expiresAt: connected ? stored[keys.expiresAt] : null,
    };
  }

  return {
    keys,
    createPkcePair,
    ensureInstallationId,
    createPendingConnection,
    storeSession,
    clearSession,
    readSession,
  };
});
