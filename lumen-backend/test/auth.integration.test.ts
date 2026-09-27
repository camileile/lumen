import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_AUDIENCE, JWT_ISSUER } from "../src/security/jwt";
import {
  authorization,
  createTestApi,
  registerFixtureUser,
  TEST_JWT_SECRET,
  type TestApi,
} from "./helpers/api-test-harness";

let api: TestApi;

before(async () => {
  api = await createTestApi("auth");
});

beforeEach(async () => {
  await api.resetDatabase();
});

after(async () => {
  await api.close();
});

describe("registration", () => {
  test("accepts a valid fictitious user without exposing the password hash", async () => {
    const result = await registerFixtureUser(api);

    assert.equal(result.user.email, "test@example.invalid");
    assert.equal(typeof result.token, "string");
    assert.doesNotMatch(JSON.stringify(result.user), /password|hash/i);
  });

  test("rejects an invalid email", async () => {
    const response = await api.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "invalid-email",
        password: "test-password",
        confirmPassword: "test-password",
      }),
    });

    assert.equal(response.status, 400);
  });

  test("rejects a short password", async () => {
    const response = await api.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.invalid",
        password: "short",
        confirmPassword: "short",
      }),
    });

    assert.equal(response.status, 400);
  });

  test("rejects mismatched password confirmation", async () => {
    const response = await api.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.invalid",
        password: "test-password",
        confirmPassword: "different-password",
      }),
    });

    assert.equal(response.status, 400);
  });

  test("rejects a duplicate email", async () => {
    await registerFixtureUser(api);
    const response = await api.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Another User",
        email: "test@example.invalid",
        password: "test-password",
        confirmPassword: "test-password",
      }),
    });

    assert.equal(response.status, 409);
  });
});

describe("login", () => {
  test("accepts valid credentials", async () => {
    await registerFixtureUser(api);
    const response = await api.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.invalid", password: "test-password" }),
    });

    assert.equal(response.status, 200);
    assert.equal(typeof (response.body as { token: unknown }).token, "string");
  });

  test("rejects an incorrect password", async () => {
    await registerFixtureUser(api);
    const response = await api.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.invalid", password: "incorrect-password" }),
    });

    assert.equal(response.status, 401);
  });

  test("rejects an unknown user", async () => {
    const response = await api.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "missing@example.invalid", password: "test-password" }),
    });

    assert.equal(response.status, 401);
  });

  test("keeps legacy mixed-case accounts accessible without creating case-variant duplicates", async () => {
    await api.prisma.user.create({
      data: {
        name: "Legacy User",
        email: "Legacy@Example.Invalid",
        password: await bcrypt.hash("test-password", 10),
      },
    });
    const loginResponse = await api.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "legacy@example.invalid", password: "test-password" }),
    });
    assert.equal(loginResponse.status, 200);

    const registration = await api.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Other User", email: "LEGACY@example.invalid", password: "test-password", confirmPassword: "test-password" }),
    });
    assert.equal(registration.status, 409);
  });
});

describe("authorization", () => {
  test("rejects a missing bearer token", async () => {
    assert.equal((await api.request("/auth/me")).status, 401);
  });

  test("rejects an invalid token", async () => {
    const response = await api.request("/auth/me", {
      headers: authorization("not-a-valid-token"),
    });
    assert.equal(response.status, 401);
  });

  test("rejects an expired token", async () => {
    const { user } = await registerFixtureUser(api);
    const token = jwt.sign({}, TEST_JWT_SECRET, {
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: user.id,
      expiresIn: -1,
    });
    const response = await api.request("/auth/me", { headers: authorization(token) });
    assert.equal(response.status, 401);
  });

  test("accepts a valid token and returns only the safe user projection", async () => {
    const { token } = await registerFixtureUser(api);
    const response = await api.request("/auth/me", { headers: authorization(token) });

    assert.equal(response.status, 200);
    assert.doesNotMatch(JSON.stringify(response.body), /password|hash|"token"/i);
  });

  test("rejects a token signed with a different algorithm", async () => {
    const { user } = await registerFixtureUser(api);
    const token = jwt.sign({}, TEST_JWT_SECRET, { algorithm: "HS384", issuer: JWT_ISSUER, audience: JWT_AUDIENCE, subject: user.id });
    assert.equal((await api.request("/auth/me", { headers: authorization(token) })).status, 401);
  });

  test("rejects tokens with a different issuer or audience", async () => {
    const { user } = await registerFixtureUser(api);
    const wrongIssuer = jwt.sign({}, TEST_JWT_SECRET, { algorithm: "HS256", issuer: "other", audience: JWT_AUDIENCE, subject: user.id });
    const wrongAudience = jwt.sign({}, TEST_JWT_SECRET, { algorithm: "HS256", issuer: JWT_ISSUER, audience: "other", subject: user.id });
    assert.equal((await api.request("/auth/me", { headers: authorization(wrongIssuer) })).status, 401);
    assert.equal((await api.request("/auth/me", { headers: authorization(wrongAudience) })).status, 401);
  });

  test("rejects a token without a valid UUID subject", async () => {
    const missing = jwt.sign({}, TEST_JWT_SECRET, { algorithm: "HS256", issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    const invalid = jwt.sign({}, TEST_JWT_SECRET, { algorithm: "HS256", issuer: JWT_ISSUER, audience: JWT_AUDIENCE, subject: "not-a-user-id" });
    assert.equal((await api.request("/auth/me", { headers: authorization(missing) })).status, 401);
    assert.equal((await api.request("/auth/me", { headers: authorization(invalid) })).status, 401);
  });

  test("fails closed with a safe error when the JWT secret is too short", async () => {
    const { token } = await registerFixtureUser(api);
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "short";
    try {
      const response = await api.request("/auth/me", { headers: authorization(token) });
      assert.equal(response.status, 500);
      assert.equal((response.body as { code: string }).code, "AUTH_CONFIGURATION_ERROR");
      assert.doesNotMatch(JSON.stringify(response.body), /jwt_secret|short|stack/i);
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
});

test("normalizes email and name without changing the compatible password minimum", async () => {
  const response = await api.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "  Test User  ", email: "  MixedCase@Example.Invalid ", password: "123456", confirmPassword: "123456" }),
  });
  assert.equal(response.status, 201);
  assert.equal((response.body as { user: { email: string; name: string } }).user.email, "mixedcase@example.invalid");
  assert.equal((response.body as { user: { email: string; name: string } }).user.name, "Test User");
});
