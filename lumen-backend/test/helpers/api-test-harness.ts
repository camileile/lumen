import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

const nativeFetch = globalThis.fetch.bind(globalThis);
const loadModule = createRequire(__filename);
const TEST_JWT_SECRET = "test-only-secret-do-not-use-in-production";
const TEST_PROVIDER_BASE_URL = "https://openrouter.test/api/v1";

export type ApiResponse = {
  status: number;
  body: unknown;
  headers: Headers;
};

export type TestApi = {
  baseUrl: string;
  prisma: PrismaClient;
  request: (route: string, init?: RequestInit) => Promise<ApiResponse>;
  resetDatabase: () => Promise<void>;
  mockOpenRouter: (handler: typeof fetch) => void;
  restoreFetch: () => void;
  close: () => Promise<void>;
};

function sqliteUrl(databasePath: string): string {
  return `file:${databasePath.replace(/\\/g, "/")}`;
}

async function createSchema(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "User_email_key" ON "User"("email")',
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "Analysis" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "url" TEXT NOT NULL,
      "domain" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "summary" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT NOT NULL,
      CONSTRAINT "Analysis_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
}

export async function createTestApi(
  suiteName: string,
  options: {
    registerLimit?: number;
    loginLimit?: number;
    analyzeLimit?: number;
    extensionAuthorizeLimit?: number;
    extensionExchangeLimit?: number;
  } = {},
): Promise<TestApi> {
  const directory = mkdtempSync(path.join(tmpdir(), `lumen-${suiteName}-`));
  const databasePath = path.join(directory, "test.db");

  process.env.DATABASE_URL = sqliteUrl(databasePath);
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.OPENROUTER_API_KEY = "test-only-openrouter-key";
  process.env.OPENROUTER_BASE_URL = TEST_PROVIDER_BASE_URL;
  process.env.CORS_ORIGIN = "http://localhost:3001";
  process.env.RATE_LIMIT_REGISTER_MAX = String(options.registerLimit ?? 1000);
  process.env.RATE_LIMIT_LOGIN_MAX = String(options.loginLimit ?? 1000);
  process.env.RATE_LIMIT_ANALYZE_MAX = String(options.analyzeLimit ?? 1000);
  process.env.RATE_LIMIT_EXTENSION_AUTHORIZE_MAX = String(options.extensionAuthorizeLimit ?? 1000);
  process.env.RATE_LIMIT_EXTENSION_EXCHANGE_MAX = String(options.extensionExchangeLimit ?? 1000);
  process.env.ANALYZE_DUPLICATE_WINDOW_SECONDS = "30";

  const prisma = (loadModule("../../src/db/prisma") as { default: PrismaClient }).default;
  await createSchema(prisma);

  const { app } = loadModule("../../src/app") as typeof import("../../src/app");
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(route: string, init?: RequestInit): Promise<ApiResponse> {
    const response = await nativeFetch(`${baseUrl}${route}`, init);
    const body: unknown = await response.json().catch(() => ({}));
    return { status: response.status, body, headers: response.headers };
  }

  function restoreFetch() {
    globalThis.fetch = nativeFetch;
  }

  return {
    baseUrl,
    prisma,
    request,
    async resetDatabase() {
      await prisma.analysis.deleteMany();
      await prisma.user.deleteMany();
    },
    mockOpenRouter(handler: typeof fetch) {
      globalThis.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith(TEST_PROVIDER_BASE_URL)) return handler(input, init);
        return nativeFetch(input, init);
      }) as typeof fetch;
    },
    restoreFetch,
    async close() {
      restoreFetch();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await prisma.$disconnect();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function registerFixtureUser(api: TestApi, email = "test@example.invalid") {
  const response = await api.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email,
      password: "test-password",
      confirmPassword: "test-password",
    }),
  });

  assert.equal(response.status, 201);
  return response.body as {
    user: { id: string; name: string; email: string; createdAt: string };
    token: string;
  };
}

export function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export { TEST_JWT_SECRET };
