/**
 * Pure rules for quiet tab rehydrate (D10).
 * @see docs/QUIET_TAB_REHYDRATE.md
 */

/**
 * @param {Array<{ owner_private_key_b58?: string, profile_id?: string }>} entries
 */
export function walletEntriesWithSigningKeys(entries) {
  return entries.filter((entry) => Boolean(entry?.owner_private_key_b58));
}

/**
 * @param {Array<{ owner_private_key_b58?: string }>} entries
 * @returns {Record<string, unknown> | null}
 */
export function soleSigningWalletEntry(entries) {
  const withKeys = walletEntriesWithSigningKeys(entries);
  return withKeys.length === 1 ? withKeys[0] : null;
}

/**
 * @param {Array<{ owner_private_key_b58?: string, profile_id?: string }>} entries
 * @param {string | null} lastActiveProfileId
 * @returns {Record<string, unknown> | null}
 */
export function resolveQuietTabRehydrateTarget(entries, lastActiveProfileId) {
  const signing = walletEntriesWithSigningKeys(entries);
  if (signing.length === 0) return null;
  if (signing.length === 1) return signing[0];
  if (!lastActiveProfileId) return null;
  return signing.find((entry) => entry.profile_id === lastActiveProfileId) ?? null;
}

/**
 * @param {{
 *   hasTabControl?: boolean,
 *   signingWalletCount?: number,
 *   targetEntry?: Record<string, unknown> | null,
 *   requiresUnlock?: boolean,
 *   quietRehydrateEnabled?: boolean,
 * }} input
 */
export function shouldQuietTabRehydrate(input) {
  const {
    hasTabControl = false,
    signingWalletCount = 0,
    targetEntry = null,
    requiresUnlock = false,
    quietRehydrateEnabled = true,
  } = input;
  if (hasTabControl || !targetEntry || requiresUnlock) return false;
  if (signingWalletCount === 1) return true;
  if (signingWalletCount > 1) return quietRehydrateEnabled;
  return false;
}
