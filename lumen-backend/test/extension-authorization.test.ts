import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EXTENSION_AUTHORIZATION_TTL_MS,
  ExtensionAuthorizationRegistry,
  pkceChallengeFromVerifier,
} from "../src/domain/extension-authorization";

const installationId = "11111111-1111-4111-8111-111111111111";
const verifier = "a".repeat(43);

function registryAt(clock: { now: number }) {
  return new ExtensionAuthorizationRegistry(() => clock.now, () => "one-time-code");
}

test("extension authorization is bound to its installation and PKCE verifier", () => {
  const clock = { now: 1_000 };
  const registry = registryAt(clock);
  const issued = registry.issue({
    userId: "22222222-2222-4222-8222-222222222222",
    installationId,
    requestId: "request_identifier_1234",
    codeChallenge: pkceChallengeFromVerifier(verifier),
  });

  assert.equal(issued.expiresAt, 1_000 + EXTENSION_AUTHORIZATION_TTL_MS);
  assert.deepEqual(registry.consume({ code: issued.code, installationId, codeVerifier: verifier }), {
    userId: "22222222-2222-4222-8222-222222222222",
    installationId,
    requestId: "request_identifier_1234",
  });
});

test("extension authorization expires and cannot be replayed", () => {
  const clock = { now: 1_000 };
  const registry = registryAt(clock);
  const input = {
    userId: "22222222-2222-4222-8222-222222222222",
    installationId,
    requestId: "request_identifier_1234",
    codeChallenge: pkceChallengeFromVerifier(verifier),
  };

  const replay = registry.issue(input);
  assert.ok(registry.consume({ code: replay.code, installationId, codeVerifier: verifier }));
  assert.equal(registry.consume({ code: replay.code, installationId, codeVerifier: verifier }), null);

  const expired = registry.issue(input);
  clock.now += EXTENSION_AUTHORIZATION_TTL_MS;
  assert.equal(registry.consume({ code: expired.code, installationId, codeVerifier: verifier }), null);
});

test("a mismatched installation or verifier invalidates the one-time authorization", () => {
  const clock = { now: 1_000 };
  const registry = registryAt(clock);
  const issued = registry.issue({
    userId: "22222222-2222-4222-8222-222222222222",
    installationId,
    requestId: "request_identifier_1234",
    codeChallenge: pkceChallengeFromVerifier(verifier),
  });

  assert.equal(registry.consume({
    code: issued.code,
    installationId: "33333333-3333-4333-8333-333333333333",
    codeVerifier: verifier,
  }), null);
  assert.equal(registry.consume({ code: issued.code, installationId, codeVerifier: verifier }), null);
});
