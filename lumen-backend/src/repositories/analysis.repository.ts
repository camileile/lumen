import { Prisma } from "@prisma/client";
import prisma from "../db/prisma";
import { normalizeCategory, type Category } from "../domain/score";

const VALID_CATEGORY_SQL = Prisma.sql`
  UPPER(TRIM("category")) IN (
    'A', 'B', 'C', 'D',
    'CONFIAVEL', 'NEUTRO', 'DESCONHECIDO', 'SENSACIONALISTA', 'DESINFORMACAO'
  )
`;

type CategoryRow = { category: string };
type ObservationRow = { category: string; createdAt: Date | string };

function positiveLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Query limit must be a positive integer");
  return value;
}

export async function findRecentValidCategories(userId: string, limit: number): Promise<Category[]> {
  const rows = await prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
    SELECT "category"
    FROM "Analysis"
    WHERE "userId" = ${userId} AND ${VALID_CATEGORY_SQL}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${positiveLimit(limit)}
  `);

  return rows.flatMap((row) => {
    const category = normalizeCategory(row.category);
    return category ? [category] : [];
  });
}

export async function findRecentMetricObservations(userId: string, limit: number): Promise<{
  observations: Array<{ category: Category; createdAt: Date }>;
  truncated: boolean;
}> {
  const boundedLimit = positiveLimit(limit);
  const rows = await prisma.$queryRaw<ObservationRow[]>(Prisma.sql`
    SELECT "category", "createdAt"
    FROM "Analysis"
    WHERE "userId" = ${userId} AND ${VALID_CATEGORY_SQL}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${boundedLimit + 1}
  `);
  const truncated = rows.length > boundedLimit;

  const observations = rows.slice(0, boundedLimit).flatMap((row) => {
    const category = normalizeCategory(row.category);
    const createdAt = new Date(row.createdAt);
    return category && !Number.isNaN(createdAt.getTime()) ? [{ category, createdAt }] : [];
  }).reverse();

  return { observations, truncated };
}
