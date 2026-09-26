import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHostname,
  hostnameFromHttpUrl,
  normalizeHostname,
} from "../src/domain/source-classifier";

test("normalizes exact, www, uppercase, and trailing-dot hosts", () => {
  assert.equal(normalizeHostname("WWW.BBC.COM."), "bbc.com");
  assert.equal(classifyHostname("bbc.com").category, "A");
  assert.equal(classifyHostname("www.bbc.com").category, "A");
});

test("allows real subdomains without accepting deceptive suffixes", () => {
  assert.deepEqual(classifyHostname("news.bbc.com"), { category: "A", knownSource: true });
  assert.deepEqual(classifyHostname("bbc.com.attacker.example"), {
    category: "B",
    knownSource: false,
  });
  assert.deepEqual(classifyHostname("attacker-bbc.com"), {
    category: "B",
    knownSource: false,
  });
});

test("extracts only HTTP or HTTPS hostnames from valid URLs", () => {
  assert.equal(hostnameFromHttpUrl("https://WWW.BBC.COM/article"), "bbc.com");
  assert.equal(hostnameFromHttpUrl("not a url"), null);
  assert.equal(hostnameFromHttpUrl("ftp://bbc.com/article"), null);
});
