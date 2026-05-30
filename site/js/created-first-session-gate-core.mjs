/**
 * First-session backup gate before control workspace (P0-4 · R4).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-4
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md Phase 2
 */

import { rootHasChildObjectBackupSeatbelt } from "./child-object-backup-gate-core.mjs";

/**
 * @param {{
 *   freshParam?: boolean,
 *   walletSaved?: boolean,
 *   setupDone?: boolean,
 *   seatbeltSatisfied?: boolean,
 * }} input
 */
export function firstSessionSetupRequired(input) {
  const { freshParam = false, walletSaved = false } = input;
  if (freshParam || !walletSaved) return true;
  // Returning steward: saved on device, not post-create — open card controls, not setup Print.
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Record<string, unknown> | null | undefined} [walletEntry]
 */
export function ownershipBackupSeatbeltSatisfied(session, walletEntry) {
  return (
    rootHasChildObjectBackupSeatbelt(session) ||
    rootHasChildObjectBackupSeatbelt(walletEntry)
  );
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown> | null | undefined} session
 */
export function mergeOwnershipSeatbeltFields(target, session) {
  if (!session || typeof session !== "object") return target;
  if (session.recovery_key_acknowledged === true) {
    target.recovery_key_acknowledged = true;
  }
  const exportedAt = session.key_backup_exported_at;
  if (typeof exportedAt === "string" && exportedAt.trim()) {
    target.key_backup_exported_at = exportedAt;
  }
  const importedAt = session.key_imported_at;
  if (typeof importedAt === "string" && importedAt.trim()) {
    target.key_imported_at = importedAt;
  }
  return target;
}
