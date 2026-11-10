import assert from "node:assert/strict";
import { closeSync, mkdtempSync, openSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { deployMigrations, markBaselineApplied } from "./helpers/migration-test-utils";

type Statement = {
  all: (...parameters: unknown[]) => unknown[];
  get: (...parameters: unknown[]) => unknown;
  run: (...parameters: unknown[]) => unknown;
};

type Database = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};

const loadModule = createRequire(__filename);
const BetterSqlite3 = loadModule("better-sqlite3") as new (filename: string) => Database;

function temporaryDatabase(name: string) {
  const directory = mkdtempSync(path.join(tmpdir(), `lumen-migration-${name}-`));
  const filename = path.join(directory, "test.db");
  closeSync(openSync(filename, "a"));
  return {
    directory,
    filename,
    url: `file:${filename.replace(/\\/g, "/")}`,
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

function createExistingSchema(database: Database): void {
  database.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL DEFAULT '',
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
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
    );
  `);
}

function indexNames(database: Database): string[] {
  return database.prepare(`SELECT "name" FROM "sqlite_master" WHERE "type" = 'index'`)
    .all()
    .map((row) => (row as { name: string }).name);
}

test("deploys the complete migration chain on an empty database", () => {
  const fixture = temporaryDatabase("empty");
  try {
    deployMigrations(fixture.url);
    const database = new BetterSqlite3(fixture.filename);
    try {
      const tables = database.prepare(`SELECT "name" FROM "sqlite_master" WHERE "type" = 'table'`)
        .all()
        .map((row) => (row as { name: string }).name);
      const indexes = indexNames(database);

      assert.ok(tables.includes("User"));
      assert.ok(tables.includes("Analysis"));
      assert.ok(tables.includes("ExtensionSession"));
      assert.ok(tables.includes("_prisma_migrations"));
      assert.ok(indexes.includes("User_email_nocase_key"));
      assert.ok(indexes.includes("Analysis_userId_createdAt_idx"));
      assert.ok(indexes.includes("Analysis_userId_url_createdAt_idx"));
      assert.ok(indexes.includes("ExtensionSession_userId_installationId_key"));
    } finally {
      database.close();
    }
  } finally {
    fixture.cleanup();
  }
});

test("baselines an existing current-schema database without losing data", () => {
  const fixture = temporaryDatabase("existing");
  try {
    const database = new BetterSqlite3(fixture.filename);
    createExistingSchema(database);
    database.prepare(`
      INSERT INTO "User" ("id", "name", "email", "password") VALUES (?, ?, ?, ?)
    `).run("user-1", "Fixture User", "fixture@example.invalid", "fixture-hash");
    database.prepare(`
      INSERT INTO "Analysis"
        ("id", "url", "domain", "category", "score", "summary", "text", "userId")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "analysis-1",
      "https://news.example/article",
      "news.example",
      "A",
      100,
      "Fixture summary",
      "Fixture summary",
      "user-1",
    );
    database.close();

    markBaselineApplied(fixture.url);
    deployMigrations(fixture.url);

    const migrated = new BetterSqlite3(fixture.filename);
    try {
      const userCount = migrated.prepare(`SELECT COUNT(*) AS "count" FROM "User"`).get() as { count: number };
      const analysisCount = migrated.prepare(`SELECT COUNT(*) AS "count" FROM "Analysis"`).get() as { count: number };
      assert.equal(userCount.count, 1);
      assert.equal(analysisCount.count, 1);
      assert.ok(indexNames(migrated).includes("User_email_nocase_key"));
      assert.throws(() => {
        migrated.prepare(`
          INSERT INTO "User" ("id", "name", "email", "password") VALUES (?, ?, ?, ?)
        `).run("user-2", "Duplicate", "FIXTURE@example.invalid", "fixture-hash");
      }, /UNIQUE constraint failed/i);
    } finally {
      migrated.close();
    }
  } finally {
    fixture.cleanup();
  }
});

test("refuses case-insensitive email collisions without deleting existing rows", () => {
  const fixture = temporaryDatabase("collision");
  try {
    const database = new BetterSqlite3(fixture.filename);
    createExistingSchema(database);
    const insert = database.prepare(`
      INSERT INTO "User" ("id", "name", "email", "password") VALUES (?, ?, ?, ?)
    `);
    insert.run("user-1", "First", "collision@example.invalid", "fixture-hash");
    insert.run("user-2", "Second", "COLLISION@example.invalid", "fixture-hash");
    database.close();

    markBaselineApplied(fixture.url);
    assert.throws(() => deployMigrations(fixture.url), /migration|unique|failed/i);

    const unchanged = new BetterSqlite3(fixture.filename);
    try {
      const result = unchanged.prepare(`SELECT COUNT(*) AS "count" FROM "User"`).get() as { count: number };
      assert.equal(result.count, 2);
    } finally {
      unchanged.close();
    }
  } finally {
    fixture.cleanup();
  }
});

test("uses the data-foundation indexes for bounded per-user reads", () => {
  const fixture = temporaryDatabase("query-plan");
  try {
    deployMigrations(fixture.url);
    const database = new BetterSqlite3(fixture.filename);
    try {
      database.prepare(`
        INSERT INTO "User" ("id", "name", "email", "password") VALUES (?, ?, ?, ?)
      `).run("user-1", "Fixture User", "query-plan@example.invalid", "fixture-hash");
      const insert = database.prepare(`
        INSERT INTO "Analysis"
          ("id", "url", "domain", "category", "score", "summary", "text", "createdAt", "userId")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      database.exec("BEGIN");
      try {
        for (let index = 0; index < 2000; index++) {
          insert.run(
            `analysis-${index}`,
            `https://news.example/article-${index % 25}`,
            "news.example",
            index % 2 === 0 ? "A" : "B",
            75,
            "Fixture summary",
            "Fixture summary",
            new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
            "user-1",
          );
        }
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      const historyPlan = database.prepare(`
        EXPLAIN QUERY PLAN
        SELECT "category", "createdAt" FROM "Analysis"
        WHERE "userId" = ?
          AND UPPER(TRIM("category")) IN (
            'A', 'B', 'C', 'D',
            'CONFIAVEL', 'NEUTRO', 'DESCONHECIDO', 'SENSACIONALISTA', 'DESINFORMACAO'
          )
        ORDER BY "createdAt" DESC, "id" DESC LIMIT 1001
      `).all("user-1") as Array<{ detail: string }>;
      const duplicatePlan = database.prepare(`
        EXPLAIN QUERY PLAN
        SELECT "id" FROM "Analysis"
        WHERE "userId" = ? AND "url" = ? AND "createdAt" >= ? LIMIT 1
      `).all("user-1", "https://news.example/article-1", "2026-01-01") as Array<{ detail: string }>;

      assert.match(
        historyPlan.map(({ detail }) => detail).join("\n"),
        /Analysis_userId_createdAt_idx/,
      );
      assert.match(
        duplicatePlan.map(({ detail }) => detail).join("\n"),
        /Analysis_userId_url_createdAt_idx/,
      );
    } finally {
      database.close();
    }
  } finally {
    fixture.cleanup();
  }
});
