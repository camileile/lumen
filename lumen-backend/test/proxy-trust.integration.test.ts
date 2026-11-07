import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createTestApi, type TestApi } from "./helpers/api-test-harness";

// app.ts reads TRUST_PROXY_HOPS at import time, so this file configures it before the API loads.
// node:test runs each test file in its own process, keeping this setting isolated.
let api: TestApi;
before(async () => {
  process.env.TRUST_PROXY_HOPS = "1";
  api = await createTestApi("proxy-trust", { loginLimit: 1 });
});
after(async () => {
  delete process.env.TRUST_PROXY_HOPS;
  await api.close();
});

function login(forwardedFor: string) {
  return api.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": forwardedFor },
    body: JSON.stringify({ email: "missing@example.invalid", password: "test-password" }),
  });
}

test("one trusted proxy hop keys rate limits on the forwarded client address", async () => {
  assert.equal((await login("203.0.113.10")).status, 401);
  assert.equal((await login("203.0.113.10")).status, 429);

  // A different forwarded client has its own bucket.
  assert.equal((await login("203.0.113.20")).status, 401);
});

test("only the nearest forwarded hop is trusted", async () => {
  // With one trusted hop, a client-supplied left-most entry cannot choose the key.
  assert.equal((await login("198.51.100.1, 203.0.113.30")).status, 401);
  assert.equal((await login("198.51.100.2, 203.0.113.30")).status, 429);
});

test("IPv4-mapped IPv6 forwarded addresses keep a stable rate-limit key", async () => {
  assert.equal((await login("::ffff:203.0.113.40")).status, 401);
  assert.equal((await login("::ffff:203.0.113.40")).status, 429);
});
