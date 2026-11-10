const assert = require("node:assert/strict");
const { test } = require("node:test");
const extensionAuth = require("../extension-auth.js");

function storage() {
  const values = {};
  return {
    values,
    accessLevel: null,
    async get(keys) {
      return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]));
    },
    async set(next) { Object.assign(values, next); },
    async remove(keys) { for (const key of keys) delete values[key]; },
    async setAccessLevel(options) { this.accessLevel = options.accessLevel; },
  };
}

test("creates and reuses a non-secret random installation identifier", async () => {
  const local = storage();
  let calls = 0;
  const value = "11111111-1111-4111-8111-111111111111";
  assert.equal(await extensionAuth.ensureInstallationId(local, () => { calls += 1; return value; }), value);
  assert.equal(await extensionAuth.ensureInstallationId(local, () => { calls += 1; return "other"; }), value);
  assert.equal(calls, 1);
});

test("stores access and refresh credentials in separate protected storage areas", async () => {
  const local = storage();
  const session = storage();
  const sync = { calls: 0, async set() { this.calls += 1; } };
  await extensionAuth.configureTrustedStorage(local, session);
  await extensionAuth.storeSession(local, session, {
    accessToken: "extension-access-token",
    refreshToken: "extension-refresh-token",
    user: { name: "Test User", email: "test@example.invalid" },
    accessExpiresAt: 10_000,
    refreshExpiresAt: 20_000,
  });

  assert.equal(sync.calls, 0);
  assert.equal(local.accessLevel, "TRUSTED_CONTEXTS");
  assert.equal(session.accessLevel, "TRUSTED_CONTEXTS");
  assert.equal(local.values[extensionAuth.keys.accessToken], undefined);
  assert.equal(local.values[extensionAuth.keys.refreshToken], "extension-refresh-token");
  assert.equal(session.values[extensionAuth.keys.accessToken], "extension-access-token");
  assert.equal((await extensionAuth.readSession(local, session, 1_000)).connected, true);
  await extensionAuth.clearSession(local, session);
  assert.equal((await extensionAuth.readSession(local, session, 1_000)).connected, false);
});

test("two devices keep distinct local sessions for the same account", async () => {
  const deviceA = storage();
  const deviceB = storage();
  const transientA = storage();
  const transientB = storage();
  const user = { name: "Test User", email: "test@example.invalid" };
  await extensionAuth.storeSession(deviceA, transientA, {
    accessToken: "token-a", refreshToken: "refresh-a", user, accessExpiresAt: 10_000, refreshExpiresAt: 20_000,
  });
  await extensionAuth.storeSession(deviceB, transientB, {
    accessToken: "token-b", refreshToken: "refresh-b", user, accessExpiresAt: 10_000, refreshExpiresAt: 20_000,
  });

  assert.equal((await extensionAuth.readSession(deviceA, transientA, 1_000)).accessToken, "token-a");
  assert.equal((await extensionAuth.readSession(deviceB, transientB, 1_000)).accessToken, "token-b");
  assert.notEqual(deviceA.values[extensionAuth.keys.refreshToken], deviceB.values[extensionAuth.keys.refreshToken]);
});

test("an expired access token remains refreshable until the device session expires", async () => {
  const local = storage();
  const session = storage();
  await extensionAuth.storeSession(local, session, {
    accessToken: "expired", refreshToken: "refreshable", user: {}, accessExpiresAt: 999, refreshExpiresAt: 2_000,
  });
  const state = await extensionAuth.readSession(local, session, 1_000);
  assert.equal(state.connected, false);
  assert.equal(state.canRefresh, true);
  assert.equal(state.refreshToken, "refreshable");
  assert.equal(session.values[extensionAuth.keys.accessToken], undefined);
});
