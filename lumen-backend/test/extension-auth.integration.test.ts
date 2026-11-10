import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { pkceChallengeFromVerifier } from "../src/domain/extension-authorization";
import { verifyExtensionSessionToken } from "../src/security/jwt";
import {
  authorization,
  createTestApi,
  registerFixtureUser,
  type TestApi,
} from "./helpers/api-test-harness";

let api: TestApi;
const verifier = "a".repeat(43);
const installationA = "11111111-1111-4111-8111-111111111111";
const installationB = "22222222-2222-4222-8222-222222222222";

before(async () => { api = await createTestApi("extension-auth"); });
beforeEach(async () => {
  await api.resetDatabase();
});
after(async () => { if (api) await api.close(); });

async function authorize(token: string, installationId: string, suffix: string) {
  return api.request("/extension/authorizations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(token) },
    body: JSON.stringify({
      requestId: `request_identifier_${suffix}`,
      installationId,
      codeChallenge: pkceChallengeFromVerifier(verifier),
    }),
  });
}

async function exchange(code: string, installationId: string) {
  return api.request("/extension/session/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, installationId, codeVerifier: verifier }),
  });
}

async function refresh(refreshToken: string, installationId: string) {
  return api.request("/extension/session/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, installationId }),
  });
}

async function logout(accessToken: string) {
  return api.request("/extension/session/logout", {
    method: "POST",
    headers: authorization(accessToken),
  });
}

test("requires an authenticated web session to create an authorization", async () => {
  assert.equal((await authorize("invalid-token", installationA, "unauthenticated")).status, 401);
});

test("exchanges a valid one-time authorization for a safe extension session", async () => {
  const { token, user } = await registerFixtureUser(api);
  const created = await authorize(token, installationA, "valid_authorization");
  assert.equal(created.status, 201);
  const code = (created.body as { authorizationCode: string }).authorizationCode;

  const result = await exchange(code, installationA);
  assert.equal(result.status, 200);
  const body = result.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
    accessExpiresInSeconds: number;
    refreshExpiresAt: string;
  };
  assert.equal(body.user.id, user.id);
  assert.equal(body.accessExpiresInSeconds, 900);
  assert.ok(new Date(body.refreshExpiresAt).getTime() > Date.now());
  assert.doesNotMatch(JSON.stringify(body.user), /password|hash|token/i);

  const claims = verifyExtensionSessionToken(body.accessToken);
  assert.equal(claims.userId, user.id);
  assert.equal(claims.installationId, installationA);
  assert.match(claims.sessionId, /^[0-9a-f-]{36}$/i);
  assert.equal((await api.request("/auth/me", { headers: authorization(body.accessToken) })).status, 200);
  assert.equal((await api.request("/history", { headers: authorization(body.accessToken) })).status, 200);
  const stored = await api.prisma.extensionSession.findUniqueOrThrow({ where: { id: claims.sessionId } });
  assert.notEqual(stored.refreshTokenHash, body.refreshToken);
});

test("rejects replay and installation mismatch", async () => {
  const { token } = await registerFixtureUser(api);
  const created = await authorize(token, installationA, "single_use_code");
  const code = (created.body as { authorizationCode: string }).authorizationCode;

  assert.equal((await exchange(code, installationB)).status, 400);
  assert.equal((await exchange(code, installationA)).status, 400);
});

test("an extension session cannot authorize another extension", async () => {
  const { token } = await registerFixtureUser(api);
  const created = await authorize(token, installationA, "web_only_authorize");
  const code = (created.body as { authorizationCode: string }).authorizationCode;
  const exchanged = await exchange(code, installationA);
  const extensionToken = (exchanged.body as { accessToken: string }).accessToken;

  assert.equal((await authorize(extensionToken, installationB, "extension_denied")).status, 403);
});

test("two installations get independent sessions for the same account", async () => {
  const { token, user } = await registerFixtureUser(api);
  const createdA = await authorize(token, installationA, "device_alpha_1234");
  const createdB = await authorize(token, installationB, "device_beta_12345");
  const sessionA = await exchange((createdA.body as { authorizationCode: string }).authorizationCode, installationA);
  const sessionB = await exchange((createdB.body as { authorizationCode: string }).authorizationCode, installationB);
  const tokenA = (sessionA.body as { accessToken: string }).accessToken;
  const tokenB = (sessionB.body as { accessToken: string }).accessToken;

  assert.notEqual(tokenA, tokenB);
  assert.equal(verifyExtensionSessionToken(tokenA).userId, user.id);
  assert.equal(verifyExtensionSessionToken(tokenB).userId, user.id);
  assert.equal(verifyExtensionSessionToken(tokenA).installationId, installationA);
  assert.equal(verifyExtensionSessionToken(tokenB).installationId, installationB);
});

test("rotates refresh tokens and rejects replay", async () => {
  const { token } = await registerFixtureUser(api);
  const created = await authorize(token, installationA, "refresh_rotation");
  const exchanged = await exchange((created.body as { authorizationCode: string }).authorizationCode, installationA);
  const first = exchanged.body as { accessToken: string; refreshToken: string };

  const rotated = await refresh(first.refreshToken, installationA);
  assert.equal(rotated.status, 200);
  const second = rotated.body as { accessToken: string; refreshToken: string };
  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.equal((await refresh(first.refreshToken, installationA)).status, 401);
  assert.equal((await api.request("/auth/me", { headers: authorization(second.accessToken) })).status, 200);
});

test("logout revokes only the current device session", async () => {
  const { token } = await registerFixtureUser(api);
  const createdA = await authorize(token, installationA, "logout_alpha_123");
  const createdB = await authorize(token, installationB, "logout_beta_1234");
  const sessionA = (await exchange((createdA.body as { authorizationCode: string }).authorizationCode, installationA)).body as {
    accessToken: string; refreshToken: string;
  };
  const sessionB = (await exchange((createdB.body as { authorizationCode: string }).authorizationCode, installationB)).body as {
    accessToken: string;
  };

  assert.equal((await logout(sessionA.accessToken)).status, 204);
  assert.equal((await api.request("/auth/me", { headers: authorization(sessionA.accessToken) })).status, 401);
  assert.equal((await refresh(sessionA.refreshToken, installationA)).status, 401);
  assert.equal((await api.request("/auth/me", { headers: authorization(sessionB.accessToken) })).status, 200);
});

test("web sessions can list and revoke only their own devices", async () => {
  const first = await registerFixtureUser(api, "first-device@example.invalid");
  const second = await registerFixtureUser(api, "second-device@example.invalid");
  const created = await authorize(first.token, installationA, "managed_device_123");
  const extension = (await exchange((created.body as { authorizationCode: string }).authorizationCode, installationA)).body as {
    accessToken: string;
  };
  const sessionId = verifyExtensionSessionToken(extension.accessToken).sessionId;

  const listed = await api.request("/extension/sessions", { headers: authorization(first.token) });
  assert.equal(listed.status, 200);
  const sessions = (listed.body as { sessions: Array<Record<string, unknown>> }).sessions;
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, sessionId);
  assert.doesNotMatch(JSON.stringify(sessions), /refreshTokenHash|password|token/i);

  const forbidden = await api.request("/extension/sessions/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(second.token) },
    body: JSON.stringify({ sessionId }),
  });
  assert.equal(forbidden.status, 404);

  const revoked = await api.request("/extension/sessions/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorization(first.token) },
    body: JSON.stringify({ sessionId }),
  });
  assert.equal(revoked.status, 204);
  assert.equal((await api.request("/auth/me", { headers: authorization(extension.accessToken) })).status, 401);
});

test("reconnecting one installation invalidates its previous access token", async () => {
  const { token } = await registerFixtureUser(api);
  const firstAuthorization = await authorize(token, installationA, "reconnect_first_1");
  const first = (await exchange(
    (firstAuthorization.body as { authorizationCode: string }).authorizationCode,
    installationA,
  )).body as { accessToken: string };
  const secondAuthorization = await authorize(token, installationA, "reconnect_second_2");
  const second = (await exchange(
    (secondAuthorization.body as { authorizationCode: string }).authorizationCode,
    installationA,
  )).body as { accessToken: string };

  assert.equal((await api.request("/auth/me", { headers: authorization(first.accessToken) })).status, 401);
  assert.equal((await api.request("/auth/me", { headers: authorization(second.accessToken) })).status, 200);
});
