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
  const body = result.body as { token: string; user: { id: string; email: string }; expiresInSeconds: number };
  assert.equal(body.user.id, user.id);
  assert.equal(body.expiresInSeconds, 86_400);
  assert.doesNotMatch(JSON.stringify(body.user), /password|hash|token/i);

  const claims = verifyExtensionSessionToken(body.token);
  assert.equal(claims.userId, user.id);
  assert.equal(claims.installationId, installationA);
  assert.equal((await api.request("/auth/me", { headers: authorization(body.token) })).status, 200);
  assert.equal((await api.request("/history", { headers: authorization(body.token) })).status, 200);
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
  const extensionToken = (exchanged.body as { token: string }).token;

  assert.equal((await authorize(extensionToken, installationB, "extension_denied")).status, 403);
});

test("two installations get independent sessions for the same account", async () => {
  const { token, user } = await registerFixtureUser(api);
  const createdA = await authorize(token, installationA, "device_alpha_1234");
  const createdB = await authorize(token, installationB, "device_beta_12345");
  const sessionA = await exchange((createdA.body as { authorizationCode: string }).authorizationCode, installationA);
  const sessionB = await exchange((createdB.body as { authorizationCode: string }).authorizationCode, installationB);
  const tokenA = (sessionA.body as { token: string }).token;
  const tokenB = (sessionB.body as { token: string }).token;

  assert.notEqual(tokenA, tokenB);
  assert.equal(verifyExtensionSessionToken(tokenA).userId, user.id);
  assert.equal(verifyExtensionSessionToken(tokenB).userId, user.id);
  assert.equal(verifyExtensionSessionToken(tokenA).installationId, installationA);
  assert.equal(verifyExtensionSessionToken(tokenB).installationId, installationB);
});
