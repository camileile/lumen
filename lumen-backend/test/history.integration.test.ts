import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  authorization,
  createTestApi,
  registerFixtureUser,
  type TestApi,
} from "./helpers/api-test-harness";
import { signExtensionSessionToken } from "../src/security/jwt";

let api: TestApi;

before(async () => {
  api = await createTestApi("history");
});

beforeEach(async () => {
  await api.resetDatabase();
});

after(async () => {
  await api.close();
});

async function history(token: string) {
  return api.request("/history", { headers: authorization(token) });
}

async function deleteHistory(token: string) {
  return api.request("/history", { method: "DELETE", headers: authorization(token) });
}

function analysisFixture(userId: string, input: {
  id: string;
  category: string;
  score: number;
  createdAt: string;
}) {
  return {
    id: input.id,
    url: `https://news.example/${input.id}`,
    domain: "news.example",
    category: input.category,
    score: input.score,
    summary: "Synthetic test observation",
    text: "Synthetic test observation",
    createdAt: new Date(input.createdAt),
    userId,
  };
}

test("rejects history access without authentication", async () => {
  const response = await api.request("/history");
  assert.equal(response.status, 401);
});

test("deletes only the authenticated user's analysis history", async () => {
  const first = await registerFixtureUser(api, "first@example.invalid");
  const second = await registerFixtureUser(api, "second@example.invalid");
  await api.prisma.analysis.createMany({
    data: [
      analysisFixture(first.user.id, {
        id: "first-analysis",
        category: "A",
        score: 100,
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
      analysisFixture(second.user.id, {
        id: "second-analysis",
        category: "B",
        score: 75,
        createdAt: "2026-09-02T00:00:00.000Z",
      }),
    ],
  });

  assert.equal((await api.request("/history", { method: "DELETE" })).status, 401);
  const installationId = "11111111-1111-4111-8111-111111111111";
  const extensionSessionId = "33333333-3333-4333-8333-333333333333";
  await api.prisma.extensionSession.create({
    data: {
      id: extensionSessionId,
      installationId,
      refreshTokenHash: "history-test-refresh-token-hash",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      userId: first.user.id,
    },
  });
  const extensionToken = signExtensionSessionToken(first.user.id, installationId, extensionSessionId);
  const extensionDelete = await deleteHistory(extensionToken);
  assert.equal(extensionDelete.status, 403);
  assert.equal((extensionDelete.body as { code: string }).code, "WEB_SESSION_REQUIRED");
  const response = await deleteHistory(first.token);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { deletedCount: 1 });
  assert.equal(await api.prisma.analysis.count({ where: { userId: first.user.id } }), 0);
  assert.equal(await api.prisma.analysis.count({ where: { userId: second.user.id } }), 1);
});

test("returns an honest empty state for zero observations", async () => {
  const { token } = await registerFixtureUser(api);
  const response = await history(token);
  const body = response.body as {
    items: unknown[];
    score: number | null;
    weeklyAverage: number | null;
    scoreHistory: unknown[];
    weeklyAverages: unknown[];
    trend: { direction: string };
  };

  assert.equal(response.status, 200);
  assert.deepEqual(body.items, []);
  assert.equal(body.score, null);
  assert.equal(body.weeklyAverage, null);
  assert.deepEqual(body.scoreHistory, []);
  assert.deepEqual(body.weeklyAverages, []);
  assert.equal(body.trend.direction, "insufficient");
});

test("derives one real point from one observation instead of persisted score", async () => {
  const { user, token } = await registerFixtureUser(api);
  await api.prisma.analysis.create({
    data: analysisFixture(user.id, {
      id: "analysis-one",
      category: "A",
      score: 1,
      createdAt: "2026-09-01T12:00:00.000Z",
    }),
  });

  const response = await history(token);
  const body = response.body as {
    score: number;
    weeklyAverage: number;
    scoreHistory: Array<{ date: string; value: number }>;
  };

  assert.equal(body.score, 100);
  assert.equal(body.weeklyAverage, 100);
  assert.deepEqual(body.scoreHistory, [{ date: "2026-09-01", value: 100 }]);
});

test("returns real UTC dates, distribution, current score, and seven-day average", async () => {
  const { user, token } = await registerFixtureUser(api);
  await api.prisma.analysis.createMany({
    data: [
      analysisFixture(user.id, {
        id: "analysis-a",
        category: "A",
        score: 2,
        createdAt: "2026-09-01T23:59:59.999Z",
      }),
      analysisFixture(user.id, {
        id: "analysis-b",
        category: "B",
        score: 99,
        createdAt: "2026-09-02T00:00:00.000Z",
      }),
      analysisFixture(user.id, {
        id: "analysis-d",
        category: "D",
        score: 99,
        createdAt: "2026-09-08T12:00:00.000Z",
      }),
    ],
  });

  const response = await history(token);
  const body = response.body as {
    score: number;
    distribution: Record<string, number>;
    weeklyAverage: number;
    scoreHistory: Array<{ date: string; value: number }>;
    methodology: { version: string; observationWindow: number };
    weeklyAverages: Array<{ week: string; value: number; observedDays: number }>;
    trend: { direction: string; delta: number | null };
  };

  assert.equal(response.status, 200);
  assert.equal(body.score, 58);
  assert.deepEqual(body.distribution, {
    confiavel: 33,
    neutro: 33,
    sensacionalista: 0,
    desinformacao: 33,
  });
  assert.deepEqual(body.scoreHistory, [
    { date: "2026-09-01", value: 100 },
    { date: "2026-09-02", value: 88 },
    { date: "2026-09-08", value: 58 },
  ]);
  assert.equal(body.weeklyAverage, 73);
  assert.deepEqual(body.weeklyAverages.map(({ week, value, observedDays }) => ({ week, value, observedDays })), [
    { week: "2026-W36", value: 94, observedDays: 2 },
    { week: "2026-W37", value: 58, observedDays: 1 },
  ]);
  assert.deepEqual(body.trend, {
    direction: "down",
    delta: -36,
    currentAverage: 58,
    previousAverage: 94,
  });
  assert.equal(body.methodology.version, "rolling-weight-v1");
  assert.equal(body.methodology.observationWindow, 20);
  assert.doesNotMatch(JSON.stringify(body), /password|hash|"token"/i);
});

test("excludes invalid categories and never fabricates gap dates", async () => {
  const { user, token } = await registerFixtureUser(api);
  await api.prisma.analysis.createMany({
    data: [
      analysisFixture(user.id, {
        id: "analysis-a",
        category: "A",
        score: 1,
        createdAt: "2026-09-01T08:00:00.000Z",
      }),
      analysisFixture(user.id, {
        id: "analysis-invalid",
        category: "legacy-invalid",
        score: 100,
        createdAt: "2026-09-03T08:00:00.000Z",
      }),
      analysisFixture(user.id, {
        id: "analysis-b",
        category: "B",
        score: 1,
        createdAt: "2026-09-05T08:00:00.000Z",
      }),
    ],
  });

  const response = await history(token);
  const points = (response.body as { scoreHistory: Array<{ date: string }> }).scoreHistory;
  assert.deepEqual(points.map((point) => point.date), ["2026-09-01", "2026-09-05"]);
});

test("uses only the latest 20 valid categories for current score", async () => {
  const { user, token } = await registerFixtureUser(api);
  await api.prisma.analysis.createMany({
    data: [
      analysisFixture(user.id, {
        id: "old-d",
        category: "D",
        score: 100,
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
      ...Array.from({ length: 20 }, (_, index) =>
        analysisFixture(user.id, {
          id: `recent-a-${index}`,
          category: "A",
          score: 0,
          createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        }),
      ),
    ],
  });

  const response = await history(token);
  assert.equal((response.body as { score: number }).score, 100);
});

test("bounds metric history and reports when older observations were omitted", async () => {
  const { user, token } = await registerFixtureUser(api);
  await api.prisma.analysis.createMany({
    data: Array.from({ length: 21 }, (_, index) =>
      analysisFixture(user.id, {
        id: `bounded-${index}`,
        category: "A",
        score: 100,
        createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    ),
  });

  process.env.HISTORY_METRICS_MAX_OBSERVATIONS = "20";
  try {
    const response = await history(token);
    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { historyWindow: unknown }).historyWindow, {
      maxObservations: 20,
      returnedObservations: 20,
      truncated: true,
    });
  } finally {
    process.env.HISTORY_METRICS_MAX_OBSERVATIONS = "1000";
  }
});
