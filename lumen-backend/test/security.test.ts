import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MAX_ANALYSIS_URL_LENGTH, sanitizeAnalysisUrl } from "../src/security/analysis-url";
import { isForbiddenHostname, isForbiddenIpAddress, validateResolvedAddresses } from "../src/security/ssrf-policy";
import { MemoryRateLimitStore } from "../src/middleware/rateLimit.middleware";
import { allowedCorsOrigins } from "../src/security/cors";

describe("analysis URL policy", () => {
  test("accepts HTTP(S), normalizes the host, removes fragments and sensitive tracking parameters", () => {
    const result = sanitizeAnalysisUrl(" HTTPS://WWW.Example.COM/article?id=42&utm_source=x&token=secret&other=header.payload.signature#section ");
    assert.equal(result.hostname, "example.com");
    assert.equal(result.url, "https://www.example.com/article?id=42");
    assert.doesNotMatch(result.url, /secret|utm_|header|#/);
    assert.equal(sanitizeAnalysisUrl("http://example.com/a").hostname, "example.com");
  });

  test("rejects invalid, oversized, credentialed, and unsupported URLs", () => {
    for (const value of [
      "not a url",
      `https://example.com/${"a".repeat(MAX_ANALYSIS_URL_LENGTH)}`,
      "https://user:pass@example.com/article",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "ftp://example.com/file",
      "data:text/plain,test",
      "chrome://settings",
      "about:blank",
      "http://localhost/article",
      "http://intranet/article",
      "http://service.internal/article",
      "http://127.0.0.1/article",
      "http://10.0.0.1/article",
      "http://[::1]/article",
      "http://[::ffff:127.0.0.1]/article",
    ]) assert.throws(() => sanitizeAnalysisUrl(value));
  });

  test("allows deceptive public-looking hosts without treating them as an internal address", () => {
    assert.equal(sanitizeAnalysisUrl("https://bbc.com.attacker.example/a").hostname, "bbc.com.attacker.example");
  });
});

describe("future SSRF fetch policy", () => {
  test("blocks loopback, private, link-local, multicast, unspecified, metadata, and local names", () => {
    for (const host of ["localhost", "api.localhost", "service.local", "127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "224.0.0.1", "::", "::1", "::ffff:7f00:1", "fc00::1", "fe80::1", "ff02::1", "metadata.google.internal"]) {
      assert.equal(isForbiddenHostname(host), true, host);
    }
    assert.equal(isForbiddenIpAddress("8.8.8.8"), false);
  });

  test("requires every DNS answer and redirect target to remain public", () => {
    assert.equal(validateResolvedAddresses(["93.184.216.34"]), true);
    assert.equal(validateResolvedAddresses(["93.184.216.34", "127.0.0.1"]), false);
    assert.equal(validateResolvedAddresses([]), false);
    assert.equal(validateResolvedAddresses(["not-an-ip-address"]), false);
  });
});

describe("rate-limit store", () => {
  test("permits the configured window, rejects bursts, and resets deterministically", () => {
    const store = new MemoryRateLimitStore();
    assert.equal(store.hit("user", 2, 1_000, 0).allowed, true);
    assert.equal(store.hit("user", 2, 1_000, 1).allowed, true);
    assert.equal(store.hit("user", 2, 1_000, 2).allowed, false);
    assert.equal(store.hit("user", 2, 1_000, 1_000).allowed, true);
  });
});

test("CORS configuration rejects wildcards and values that are not exact origins", () => {
  assert.throws(() => allowedCorsOrigins("*"));
  assert.throws(() => allowedCorsOrigins("https://example.com/path"));
  assert.deepEqual([...allowedCorsOrigins("https://example.com,http://localhost:3001")], [
    "https://example.com",
    "http://localhost:3001",
  ]);
});
