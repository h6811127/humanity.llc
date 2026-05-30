/**
 * Tab session (`hc_created`) persistence rules for /created/.
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md § R11 / P0-6
 */

export const CREATED_SESSION_STORAGE_KEY = "hc_created";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function sessionHasTabSigningKey(session) {
  if (!session || typeof session !== "object") return false;
  const owner =
    typeof session.owner_private_key_b58 === "string"
      ? session.owner_private_key_b58.trim()
      : "";
  if (owner) return true;
  const recovery =
    typeof session.recovery_private_key_b58 === "string"
      ? session.recovery_private_key_b58.trim()
      : "";
  return Boolean(recovery);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldPersistCreatedSession(session) {
  return sessionHasTabSigningKey(session);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @returns {Record<string, unknown> | null}
 */
export function sanitizeCreatedSessionForStorage(session) {
  return shouldPersistCreatedSession(session) ? session : null;
}
