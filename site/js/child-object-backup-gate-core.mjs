/**
 * Backup seatbelt before many child objects (step 16).
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Backup and recovery
 */

/** Block additional child objects when this many active objects exist without backup seatbelt. */
export const CHILD_OBJECT_BACKUP_GATE_BLOCK_AT_ACTIVE_COUNT = 2;

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveChildObjectRow(row) {
  const status = typeof row.status === "string" ? row.status.trim() : "";
  return status !== "revoked" && status !== "disabled";
}

/**
 * @param {unknown[]} rows
 */
export function countActiveChildObjects(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.filter(isActiveChildObjectRow).length;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function rootHasChildObjectBackupSeatbelt(session) {
  if (!session || typeof session !== "object") return false;
  if (session.recovery_key_acknowledged === true) return true;
  if (typeof session.key_backup_exported_at === "string" && session.key_backup_exported_at.trim()) {
    return true;
  }
  if (typeof session.key_imported_at === "string" && session.key_imported_at.trim()) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *   activeCount: number;
 *   hasSeatbelt: boolean;
 *   adding?: number;
 * }} input
 * @returns {{
 *   allowed: boolean;
 *   warn: boolean;
 *   blocked: boolean;
 * }}
 */
export function childObjectBackupGateState(input) {
  const activeCount = Number.isFinite(input.activeCount) ? input.activeCount : 0;
  const adding = input.adding ?? 1;
  if (input.hasSeatbelt) {
    return { allowed: true, warn: false, blocked: false };
  }
  if (activeCount + adding > CHILD_OBJECT_BACKUP_GATE_BLOCK_AT_ACTIVE_COUNT) {
    return { allowed: false, warn: false, blocked: true };
  }
  if (activeCount >= 1) {
    return { allowed: true, warn: true, blocked: false };
  }
  return { allowed: true, warn: false, blocked: false };
}

/**
 * @param {{ blocked: boolean, warn: boolean }} gate
 */
export function childObjectBackupGateNoticeCopy(gate) {
  if (gate.blocked) {
    return {
      title: "Save backup before adding another object",
      body: "Your root key controls every status plate and lost-item relay on this card. Export encrypted backup or save your recovery key on Manage before adding more objects.",
    };
  }
  if (gate.warn) {
    return {
      title: "Save backup before your tree grows",
      body: "You already have one public object on this card. Export encrypted backup or save your recovery key on Manage so you keep control of the whole tree.",
    };
  }
  return null;
}
