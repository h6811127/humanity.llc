/**
 * Table names and schema readiness checks for D1 (M1.2).
 */

import {
  QR_CREDENTIALS_MIGRATION_0023_COLUMNS,
  tableColumnNamesReady,
} from "./schema-core";

export const TABLES = {
  cards: "cards",
  qr_credentials: "qr_credentials",
  verification_summaries: "verification_summaries",
  revocations: "revocations",
  vouches: "vouches",
  live_control_challenges: "live_control_challenges",
  vouch_audit_dismissals: "vouch_audit_dismissals",
} as const;

export const REQUIRED_TABLES = Object.values(TABLES);

const REQUIRED_TABLES_SQL = REQUIRED_TABLES.map(() => "?").join(", ");

async function tablesReady(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name IN (${REQUIRED_TABLES_SQL})`
    )
    .bind(...REQUIRED_TABLES)
    .first<{ n: number }>();

  return row?.n === REQUIRED_TABLES.length;
}

async function qrCredentialsHasObjectIdColumn(db: D1Database): Promise<boolean> {
  const result = await db.prepare("PRAGMA table_info(qr_credentials)").all<{ name?: string }>();
  return tableColumnNamesReady(result.results ?? [], QR_CREDENTIALS_MIGRATION_0023_COLUMNS);
}

/**
 * Verifies M1.2 migrations and 0023 child-object QR column are applied.
 */
export async function schemaReady(db: D1Database): Promise<boolean> {
  if (!(await tablesReady(db))) return false;
  return qrCredentialsHasObjectIdColumn(db);
}

/** Returns false when PRAGMA foreign_key_check reports violations (H-15). */
export async function foreignKeyIntegrityOk(db: D1Database): Promise<boolean> {
  try {
    const { results } = await db.prepare("PRAGMA foreign_key_check").all();
    return !results || results.length === 0;
  } catch {
    return false;
  }
}
