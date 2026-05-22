/**
 * Table names and schema readiness checks for D1 (M1.2).
 */

export const TABLES = {
  cards: "cards",
  qr_credentials: "qr_credentials",
  verification_summaries: "verification_summaries",
  revocations: "revocations",
} as const;

export const REQUIRED_TABLES = Object.values(TABLES);

const REQUIRED_TABLES_SQL = REQUIRED_TABLES.map(() => "?").join(", ");

/**
 * Verifies M1.2 migrations have been applied (all four tables exist).
 */
export async function schemaReady(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name IN (${REQUIRED_TABLES_SQL})`
    )
    .bind(...REQUIRED_TABLES)
    .first<{ n: number }>();

  return row?.n === REQUIRED_TABLES.length;
}
