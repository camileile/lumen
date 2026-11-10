import "dotenv/config";
import path from "node:path";
import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) {
  console.error("DATABASE_URL must identify a local SQLite file for this preflight check.");
  process.exit(1);
}

const rawPath = decodeURIComponent(databaseUrl.slice("file:".length).split("?")[0]);
const databasePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
const database = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  const tables = new Set(
    database.prepare(`SELECT "name" FROM "sqlite_master" WHERE "type" = 'table'`)
      .all()
      .map(({ name }) => name),
  );
  const requiredTables = ["User", "Analysis"];
  const missingTables = requiredTables.filter((table) => !tables.has(table));
  const requiredColumns = {
    User: ["id", "name", "email", "password", "createdAt"],
    Analysis: ["id", "url", "domain", "category", "score", "summary", "text", "createdAt", "userId"],
  };
  const missingColumnCount = Object.entries(requiredColumns).reduce((total, [table, columns]) => {
    if (!tables.has(table)) return total + columns.length;
    const existing = new Set(
      database.prepare(`PRAGMA table_info("${table}")`).all().map(({ name }) => name),
    );
    return total + columns.filter((column) => !existing.has(column)).length;
  }, 0);
  const collisionGroups = missingTables.includes("User")
    ? null
    : database.prepare(`
        SELECT COUNT(*) AS "count"
        FROM (
          SELECT lower(trim("email"))
          FROM "User"
          GROUP BY lower(trim("email"))
          HAVING COUNT(*) > 1
        )
      `).get().count;

  const summary = {
    requiredSchemaPresent: missingTables.length === 0 && missingColumnCount === 0,
    migrationHistoryPresent: tables.has("_prisma_migrations"),
    caseInsensitiveEmailCollisionGroups: collisionGroups,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.requiredSchemaPresent || collisionGroups !== 0) process.exitCode = 1;
} finally {
  database.close();
}
