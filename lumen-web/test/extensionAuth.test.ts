import assert from "node:assert/strict";
import test from "node:test";
import {
  getExtensionSessions,
  parseExtensionConnectRequest,
  revokeExtensionSession,
  safeLoginReturnPath,
} from "../src/app/lib/extensionAuth";

test("accepts a complete extension authorization request", () => {
  const params = new URLSearchParams({
    requestId: "request_identifier_1234",
    installationId: "11111111-1111-4111-8111-111111111111",
    codeChallenge: "a".repeat(43),
  });
  assert.deepEqual(parseExtensionConnectRequest(params), {
    requestId: "request_identifier_1234",
    installationId: "11111111-1111-4111-8111-111111111111",
    codeChallenge: "a".repeat(43),
  });
});

test("rejects malformed or mismatched extension request fields", () => {
  assert.equal(parseExtensionConnectRequest(new URLSearchParams()), null);
  assert.equal(parseExtensionConnectRequest(new URLSearchParams({
    requestId: "request_identifier_1234",
    installationId: "not-a-device",
    codeChallenge: "a".repeat(43),
  })), null);
});

test("login returns only to the extension confirmation or dashboard", () => {
  assert.equal(safeLoginReturnPath("/extension/connect?requestId=safe"), "/extension/connect?requestId=safe");
  assert.equal(safeLoginReturnPath("https://attacker.example/extension/connect"), "/dashboard");
  assert.equal(safeLoginReturnPath("//attacker.example/extension/connect"), "/dashboard");
  assert.equal(safeLoginReturnPath("/other"), "/dashboard");
});

test("loads only safe extension-session metadata with the web bearer", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  let request: { input: string | URL | Request; init?: RequestInit } | undefined;
  globalThis.fetch = (async (input, init) => {
    request = { input, init };
    return new Response(JSON.stringify({ sessions: [{
      id: "22222222-2222-4222-8222-222222222222",
      installationId: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-11-10T12:00:00.000Z",
      lastUsedAt: "2026-11-10T12:00:00.000Z",
      expiresAt: "2026-12-10T12:00:00.000Z",
      revokedAt: null,
      status: "active",
    }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  const result = await getExtensionSessions("test-web-token");

  assert.equal(result.sessions[0]?.status, "active");
  assert.equal(String(request?.input), "https://api.example.invalid/extension/sessions");
  assert.equal(new Headers(request?.init?.headers).get("Authorization"), "Bearer test-web-token");
});

test("revokes a selected extension session through the owner-scoped endpoint", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  let body = "";
  globalThis.fetch = (async (_input, init) => {
    body = String(init?.body);
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  await revokeExtensionSession("test-web-token", "22222222-2222-4222-8222-222222222222");

  assert.deepEqual(JSON.parse(body), { sessionId: "22222222-2222-4222-8222-222222222222" });
});
