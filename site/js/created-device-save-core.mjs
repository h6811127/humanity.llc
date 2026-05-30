/**
 * Auto-save timing rules for /created/ and post-create navigation (P0-2 · R3).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-2
 */

/**
 * @param {{
 *   autoSaveEnabled?: boolean,
 *   hasSigningKeys?: boolean,
 * }} input
 */
export function shouldSyncAutoSaveOnCreatedLoad(input) {
  const { autoSaveEnabled = false, hasSigningKeys = false } = input;
  return autoSaveEnabled && hasSigningKeys;
}

/**
 * @param {{
 *   autoSaveEnabled?: boolean,
 *   session?: Record<string, unknown> | null,
 * }} input
 */
export function shouldSyncAutoSaveBeforeCreateNavigate(input) {
  const { autoSaveEnabled = false, session = null } = input;
  return (
    autoSaveEnabled &&
    typeof session?.profile_id === "string" &&
    !!session.profile_id &&
    !!session.owner_private_key_b58
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ ok: true } | { error: string }} result
 * @param {{
 *   markFailed: (profileId: string) => void,
 *   clearFailed: (profileId: string) => void,
 * }} hooks
 */
export function applySyncAutoSaveResult(session, result, hooks) {
  const profileId =
    typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  if (!profileId) return;
  if ("error" in result) {
    hooks.markFailed(profileId);
    return;
  }
  hooks.clearFailed(profileId);
}
