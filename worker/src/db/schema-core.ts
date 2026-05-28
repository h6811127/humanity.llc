/**
 * Pure schema readiness helpers (Vitest-friendly).
 * @see docs/SCAN_WORKER_1101_POSTMORTEM.md
 */

/** Columns on qr_credentials required after migration 0023 (child-object scan QR). */
export const QR_CREDENTIALS_MIGRATION_0023_COLUMNS = ["object_id"] as const;

/**
 * @param columns PRAGMA table_info rows or equivalent
 * @param required column names that must exist
 */
export function tableColumnNamesReady(
  columns: ReadonlyArray<{ name?: string }>,
  required: ReadonlyArray<string>
): boolean {
  const names = new Set(
    columns.map((col) => col.name).filter((name): name is string => typeof name === "string")
  );
  return required.every((name) => names.has(name));
}
