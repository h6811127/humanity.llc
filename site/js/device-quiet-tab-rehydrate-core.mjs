/**
 * Pure rules for quiet tab rehydrate (D10 Tier 1).
 * @see docs/QUIET_TAB_REHYDRATE.md
 */

/**
 * @param {Array<{ owner_private_key_b58?: string }>} entries
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
 * @param {{
 *   hasTabControl?: boolean,
 *   signingWalletCount?: number,
 *   requiresUnlock?: boolean,
 * }} input
 */
export function shouldQuietTabRehydrate(input) {
  const {
    hasTabControl = false,
    signingWalletCount = 0,
    requiresUnlock = false,
  } = input;
  if (hasTabControl) return false;
  if (signingWalletCount !== 1) return false;
  if (requiresUnlock) return false;
  return true;
}
