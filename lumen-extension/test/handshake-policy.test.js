const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const policy = require("../handshake-policy.js");

const challenge = "challenge_nonce_1234567890";

describe("extension dashboard handshake", () => {
  test("accepts only the exact configured dashboard origin", () => {
    assert.equal(policy.isTrustedOrigin("http://localhost:3001"), true);
    assert.equal(policy.isTrustedOrigin("http://localhost:3001.attacker.example"), false);
    assert.equal(policy.isTrustedOrigin("https://attacker.example"), false);
  });

  test("rejects malformed nonce and token payloads", () => {
    assert.equal(policy.isValidNonce("short"), false);
    assert.equal(policy.isValidNonce(challenge), true);
    assert.equal(policy.isValidToken("not-a-jwt"), false);
    assert.equal(policy.isValidToken("header.payload.signature"), true);
  });

  test("requires a challenge and rejects replay", () => {
    let now = 1_000;
    const registry = policy.createChallengeRegistry(() => now);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge), false);
    assert.equal(registry.issue(policy.trustedDashboardOrigin, challenge), true);
    assert.equal(registry.consume("https://attacker.example", challenge), false);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge), true);
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge), false);

    registry.issue(policy.trustedDashboardOrigin, challenge);
    now += policy.challengeTtlMs + 1;
    assert.equal(registry.consume(policy.trustedDashboardOrigin, challenge), false);
  });
});
