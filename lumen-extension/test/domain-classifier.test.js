const assert = require("node:assert/strict");
const test = require("node:test");
const { loadExtensionScript } = require("./load-extension-script");

const classifier = loadExtensionScript("domain-classifier.js", "LumenDomainClassifier");

test("classifies exact and www source hosts", () => {
  assert.equal(classifier.classifyUrl("https://bbc.com/article").category, "A");
  assert.equal(classifier.classifyUrl("https://www.bbc.com/article").category, "A");
});

test("allows real subdomains of a listed source", () => {
  const result = classifier.classifyUrl("https://news.bbc.com/world");
  assert.equal(result.category, "A");
  assert.equal(result.knownSource, true);
  assert.equal(result.hostname, "news.bbc.com");
});

test("does not trust a listed source embedded before an attacker suffix", () => {
  const result = classifier.classifyUrl("https://bbc.com.attacker.example/story");
  assert.equal(result.category, "B");
  assert.equal(result.knownSource, false);
});

test("does not trust a hostname that merely contains a listed source name", () => {
  const result = classifier.classifyUrl("https://attacker-bbc.com/story");
  assert.equal(result.category, "B");
  assert.equal(result.knownSource, false);
});

test("normalizes uppercase and trailing-dot hosts", () => {
  assert.equal(classifier.classifyUrl("HTTPS://WWW.BBC.COM./story").category, "A");
});

test("rejects invalid and unsupported URLs", () => {
  assert.equal(classifier.classifyUrl("not a url"), null);
  assert.equal(classifier.classifyUrl("ftp://bbc.com/story"), null);
});
