import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { authorization, createTestApi, registerFixtureUser, type TestApi } from "./helpers/api-test-harness";

let api: TestApi;
before(async () => { api = await createTestApi("rate-limit", { registerLimit: 3, loginLimit: 2, analyzeLimit: 2 }); });
after(async () => { await api.close(); });

test("login rate limiting permits the configured requests then returns 429 with headers", async () => {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "missing@example.invalid", password: "test-password" }),
  };
  const first = await api.request("/auth/login", init);
  const second = await api.request("/auth/login", init);
  const blocked = await api.request("/auth/login", init);

  assert.equal(first.status, 401);
  assert.equal(second.status, 401);
  assert.equal(first.headers.get("ratelimit-limit"), "2");
  assert.equal(second.headers.get("ratelimit-remaining"), "0");
  assert.equal(blocked.status, 429);
  assert.equal((blocked.body as { code: string }).code, "RATE_LIMIT_EXCEEDED");
  assert.ok(blocked.headers.get("retry-after"));
});

test("register and authenticated analyze routes enforce their own limits", async () => {
  // This request is the first register hit for this isolated test process.
  const { token } = await registerFixtureUser(api, "rate-limit@example.invalid");

  const invalidRegistration = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "invalid", password: "123456", confirmPassword: "123456" }),
  };
  assert.equal((await api.request("/auth/register", invalidRegistration)).status, 400);
  assert.equal((await api.request("/auth/register", invalidRegistration)).status, 400);
  assert.equal((await api.request("/auth/register", invalidRegistration)).status, 429);

  api.mockOpenRouter(async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ category: "B", score: 50, summary: "Synthetic" }) } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  const analyze = (id: number) => api.request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(token) },
    body: JSON.stringify({ url: `https://news.example/article-${id}` }),
  });
  assert.equal((await analyze(1)).status, 200);
  assert.equal((await analyze(2)).status, 200);
  assert.equal((await analyze(3)).status, 429);
});
