import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import jwt from "jsonwebtoken";
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

    assert.equal(response.status, 400);
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

    assert.equal(response.status, 400);
  });

  test("rejects an unknown user", async () => {
    const response = await api.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "missing@example.invalid", password: "test-password" }),
    });

    assert.equal(response.status, 400);
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
    const token = jwt.sign({ userId: user.id }, TEST_JWT_SECRET, { expiresIn: -1 });
    const response = await api.request("/auth/me", { headers: authorization(token) });
    assert.equal(response.status, 401);
  });

  test("accepts a valid token and returns only the safe user projection", async () => {
    const { token } = await registerFixtureUser(api);
    const response = await api.request("/auth/me", { headers: authorization(token) });

    assert.equal(response.status, 200);
    assert.doesNotMatch(JSON.stringify(response.body), /password|hash|"token"/i);
  });
});
