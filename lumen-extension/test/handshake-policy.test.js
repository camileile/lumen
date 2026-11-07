const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const policy = require("../handshake-policy.js");

const challenge = "challenge_nonce_1234567890";
const context = {
  requestId: "request_identifier_1234",
  installationId: "11111111-1111-4111-8111-111111111111",
  codeChallenge: "a".repeat(43),
};

describe("extension dashboard handshake", () => {
  test("accepts only the exact configured dashboard origin", () => {
    assert.equal(policy.isTrustedOrigin("http://localhost:3001"), true);
    assert.equal(policy.isTrustedOrigin("http://localhost:3001.attacker.example"), false);
    assert.equal(policy.isTrustedOrigin("https://attacker.example"), false);
  });

  test("rejects malformed authorization payloads", () => {
    assert.equal(policy.isValidNonce("short"), false);
    assert.equal(policy.isValidNonce(challenge), true);
    assert.equal(policy.isValidInstallationId("not-an-installation"), false);
    assert.equal(policy.isValidInstallationId(context.installationId), true);
    assert.equal(policy.isValidPkceChallenge("short"), false);
    assert.equal(policy.isValidPkceChallenge(context.codeChallenge), true);
    assert.equal(policy.isValidAuthorizationCode("short"), false);
    assert.equal(policy.isValidAuthorizationCode("c".repeat(43)), true);
  });

  test("requires a challenge and rejects replay", () => {
    let now = 1_000;
    const registry = policy.createChallengeRegistry(() => now);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge, context), false);
    assert.equal(registry.issue(policy.trustedDashboardOrigin, challenge, context), true);
    assert.equal(registry.consume("https://attacker.example", challenge, context), false);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge, { ...context, installationId: "22222222-2222-4222-8222-222222222222" }), false);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge, context), true);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge, context), false);

    registry.issue(policy.trustedDashboardOrigin, challenge, context);
    now += policy.challengeTtlMs + 1;
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge, context), false);
  });

  test("restricts account messages to their exact dashboard paths", () => {
    assert.equal(policy.isTrustedDashboardUrl("http://localhost:3001/dashboard", "/dashboard"), true);
    assert.equal(policy.isTrustedDashboardUrl("http://localhost:3001/dashboard?tab=account", "/dashboard"), true);
    assert.equal(policy.isTrustedDashboardUrl("http://localhost:3001/", "/dashboard"), false);
    assert.equal(policy.isTrustedDashboardUrl("http://localhost:3001/dashboard/fake", "/dashboard"), false);
    assert.equal(policy.isTrustedDashboardUrl("http://localhost:3001.attacker.example/dashboard", "/dashboard"), false);
  });
});
