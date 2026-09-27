import assert from "node:assert/strict";
import test from "node:test";
import { parseExtensionConnectRequest, safeLoginReturnPath } from "../src/app/lib/extensionAuth";

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
