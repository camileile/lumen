const assert = require("node:assert/strict");
const { test } = require("node:test");
const extensionAuth = require("../extension-auth.js");

function storage() {
  const values = {};
  return {
    values,
    async get(keys) {
      return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]));
    },
    async set(next) { Object.assign(values, next); },
    async remove(keys) { for (const key of keys) delete values[key]; },
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

test("stores the bearer session only in local storage and logout preserves server data", async () => {
  const local = storage();
  const session = storage();
  const sync = { calls: 0, async set() { this.calls += 1; } };
  await extensionAuth.storeSession(local, {
    token: "extension-session-token",
    user: { name: "Test User", email: "test@example.invalid" },
    expiresAt: 10_000,
  });

  assert.equal(sync.calls, 0);
  assert.equal((await extensionAuth.readSession(local, 1_000)).connected, true);
  await extensionAuth.clearSession(local, session);
  assert.equal((await extensionAuth.readSession(local, 1_000)).connected, false);
});

test("two devices keep distinct local sessions for the same account", async () => {
  const deviceA = storage();
  const deviceB = storage();
  const user = { name: "Test User", email: "test@example.invalid" };
  await extensionAuth.storeSession(deviceA, { token: "token-a", user, expiresAt: 10_000 });
  await extensionAuth.storeSession(deviceB, { token: "token-b", user, expiresAt: 10_000 });

  assert.equal((await extensionAuth.readSession(deviceA, 1_000)).token, "token-a");
  assert.equal((await extensionAuth.readSession(deviceB, 1_000)).token, "token-b");
});

test("expired local sessions are reported as disconnected", async () => {
  const local = storage();
  await extensionAuth.storeSession(local, { token: "expired", user: {}, expiresAt: 999 });
  assert.equal((await extensionAuth.readSession(local, 1_000)).connected, false);
});
