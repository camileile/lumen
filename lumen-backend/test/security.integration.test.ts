import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { authorization, createTestApi, registerFixtureUser, type TestApi } from "./helpers/api-test-harness";

let api: TestApi;
before(async () => { api = await createTestApi("security"); });
beforeEach(async () => { api.restoreFetch(); await api.resetDatabase(); });
after(async () => { await api.close(); });

test("sets baseline security headers and hides the framework", async () => {
  const response = await api.request("/health");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.ok(response.headers.get("x-request-id"));
});

test("allows the configured CORS origin and blocks an untrusted origin", async () => {
  const allowed = await api.request("/health", { headers: { Origin: "http://localhost:3001" } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3001");

  const denied = await api.request("/health", { headers: { Origin: "https://attacker.example" } });
  assert.equal(denied.status, 403);
  assert.equal((denied.body as { code: string }).code, "CORS_ORIGIN_DENIED");
});

test("rejects request bodies above the explicit limit without leaking parser details", async () => {
  const response = await api.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.invalid", password: "x".repeat(20_000) }),
  });
  assert.equal(response.status, 413);
  assert.equal((response.body as { code: string }).code, "BODY_TOO_LARGE");
});

test("persists only the sanitized analysis URL and rejects an immediate duplicate", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () => new Response(JSON.stringify({
    model: "test/provider",
    choices: [{ message: { content: JSON.stringify({ category: "B", score: 50, summary: "Synthetic" }) } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(token) },
    body: JSON.stringify({ url: "https://News.Example/article?id=7&utm_source=x&access_token=do-not-store#fragment" }),
  };
  const first = await api.request("/analyze", init);
  assert.equal(first.status, 200);
  assert.doesNotMatch(JSON.stringify(first.body), /userId|password|hash|access_token|do-not-store/i);
  const stored = await api.prisma.analysis.findFirstOrThrow();
  assert.equal(stored.url, "https://news.example/article?id=7");
  assert.doesNotMatch(stored.url, /token|utm|fragment|do-not-store/);

  const duplicate = await api.request("/analyze", init);
  assert.equal(duplicate.status, 429);
  assert.equal((duplicate.body as { code: string }).code, "DUPLICATE_ANALYSIS");
});

test("does not expose raw database errors", async () => {
  const { token } = await registerFixtureUser(api);
  await api.prisma.$executeRawUnsafe('DROP TABLE "Analysis"');
  const response = await api.request("/history", { headers: authorization(token) });
  assert.equal(response.status, 500);
  assert.equal((response.body as { code: string }).code, "INTERNAL_ERROR");
  assert.doesNotMatch(JSON.stringify(response.body), /prisma|sqlite|analysis|stack|path/i);
});
