/**
 * Backup file text parsing (no Web Crypto / ed25519) — testable in Vitest.
 */
export const BACKUP_TYPE = "humanity_card_key_backup";
export const BACKUP_VERSION = "1.0";

function validateBackupShape(backup) {
  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup file.");
  }
  if (backup.type !== BACKUP_TYPE) {
    throw new Error("Not a Humanity Card key backup file.");
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }
  if (!backup.profile_id || !backup.public_key || !backup.kdf || !backup.cipher) {
    throw new Error("Backup file is missing required fields.");
  }
}

/**
 * @param {string} text raw .hcbackup.json contents
 */
export function parseBackupFileText(text) {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  validateBackupShape(parsed);
  return parsed;
}
