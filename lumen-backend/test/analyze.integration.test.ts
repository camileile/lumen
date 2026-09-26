import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  authorization,
  createTestApi,
  registerFixtureUser,
  type TestApi,
} from "./helpers/api-test-harness";

let api: TestApi;

before(async () => {
  api = await createTestApi("analyze");
});

beforeEach(async () => {
  api.restoreFetch();
  await api.resetDatabase();
});

after(async () => {
  await api.close();
});

function providerResponse(category: string, score: number, summary = "Synthetic provider result") {
  return new Response(
    JSON.stringify({
      model: "test/provider",
      choices: [{ message: { content: JSON.stringify({ category, score, summary }) } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

async function analyze(token: string, body: unknown) {
  return api.request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(token) },
    body: JSON.stringify(body),
  });
}

test("rejects analysis without authentication before contacting the provider", async () => {
  api.mockOpenRouter(async () => {
    throw new Error("provider must not be called");
  });

  const response = await api.request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/article" }),
  });

  assert.equal(response.status, 401);
});

test("rejects a missing URL", async () => {
  const { token } = await registerFixtureUser(api);
  assert.equal((await analyze(token, {})).status, 400);
});

test("rejects invalid or unsupported URLs", async () => {
  const { token } = await registerFixtureUser(api);
  assert.equal((await analyze(token, { url: "not a url" })).status, 400);
  assert.equal((await analyze(token, { url: "ftp://example.com/article" })).status, 400);
});

test("persists a valid provider category with the canonical score", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () => providerResponse("A", 2));

  const response = await analyze(token, { url: "https://news.example/article-1" });
  const body = response.body as {
    analysis: { category: string; score: number; domain: string };
    methodology: { version: string };
  };

  assert.equal(response.status, 200);
  assert.equal(body.analysis.category, "A");
  assert.equal(body.analysis.score, 100);
  assert.equal(body.analysis.domain, "news.example");
  assert.equal(body.methodology.version, "rolling-weight-v1");
  assert.equal(await api.prisma.analysis.count(), 1);
});

test("never substitutes the provider's arbitrary numeric score for rolling-weight-v1", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () => providerResponse("D", 100));

  const response = await analyze(token, { url: "https://news.example/article-1" });
  const analysis = (response.body as { analysis: { category: string; score: number } }).analysis;

  assert.equal(response.status, 200);
  assert.equal(analysis.category, "D");
  assert.equal(analysis.score, 0);
});

test("uses the exact-host local fallback when the provider is unavailable", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () => {
    throw new Error("synthetic network failure");
  });

  const response = await analyze(token, { url: "https://www.bbc.com/article" });
  const body = response.body as { mode: string; analysis: { category: string; score: number } };

  assert.equal(response.status, 200);
  assert.equal(body.mode, "local-fallback");
  assert.equal(body.analysis.category, "A");
  assert.equal(body.analysis.score, 100);
});

test("does not trust deceptive domains during provider fallback", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () => {
    throw new Error("synthetic provider failure");
  });

  const response = await analyze(token, { url: "https://bbc.com.attacker.example/article" });
  const analysis = (response.body as { analysis: { category: string; score: number } }).analysis;

  assert.equal(response.status, 200);
  assert.equal(analysis.category, "B");
  assert.equal(analysis.score, 75);
});

test("falls back deterministically on a provider HTTP error", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () =>
    new Response(JSON.stringify({ error: { message: "synthetic failure" } }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await analyze(token, { url: "https://example.com/article" });
  assert.equal(response.status, 200);
  assert.equal((response.body as { mode: string }).mode, "local-fallback");
});

test("falls back when the mocked provider aborts like a timeout", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async (_input, init) => {
    assert(init?.signal);
    const error = new Error("synthetic timeout");
    error.name = "AbortError";
    throw error;
  });

  const response = await analyze(token, { url: "https://example.com/article" });
  assert.equal(response.status, 200);
  assert.equal((response.body as { mode: string }).mode, "local-fallback");
});

test("handles a malformed AI payload without trusting a numeric default", async () => {
  const { token } = await registerFixtureUser(api);
  api.mockOpenRouter(async () =>
    new Response(
      JSON.stringify({ model: "test/provider", choices: [{ message: { content: "not-json" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const response = await analyze(token, { url: "https://example.com/article" });
  const analysis = (response.body as { analysis: { category: string; score: number } }).analysis;

  assert.equal(response.status, 200);
  assert.equal(analysis.category, "B");
  assert.equal(analysis.score, 75);
});
