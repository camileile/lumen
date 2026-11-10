import { spawnSync } from "node:child_process";
import path from "node:path";

export const BASELINE_MIGRATION = "20261110170000_baseline_current_schema";

function runPrisma(arguments_: readonly string[], databaseUrl: string): void {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, ...arguments_], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Prisma command failed (${arguments_.join(" ")}):\n${details}`);
  }
}

export function deployMigrations(databaseUrl: string): void {
  runPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], databaseUrl);
}

export function markBaselineApplied(databaseUrl: string): void {
  runPrisma([
    "migrate",
    "resolve",
    "--applied",
    BASELINE_MIGRATION,
    "--schema",
    "prisma/schema.prisma",
  ], databaseUrl);
}
