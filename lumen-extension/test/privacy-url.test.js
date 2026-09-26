const assert = require("node:assert/strict");
const { test } = require("node:test");
const { sanitizeForAnalysis } = require("../privacy-url.js");

test("extension removes fragments, tracking, credentials, and token-like query values before storage or network use", () => {
  const value = sanitizeForAnalysis("https://News.Example/article?id=7&utm_source=x&session_id=secret&other=header.payload.signature#fragment");
  assert.equal(value, "https://news.example/article?id=7");
  assert.equal(sanitizeForAnalysis("https://user:pass@example.com/article"), null);
  assert.equal(sanitizeForAnalysis(`https://example.com/${"a".repeat(2048)}`), null);
});

test("extension retains non-sensitive query parameters needed to identify content", () => {
  assert.equal(sanitizeForAnalysis("https://example.com/article?edition=br&id=42"), "https://example.com/article?edition=br&id=42");
});
