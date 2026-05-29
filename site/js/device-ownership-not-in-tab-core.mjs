/**
 * Wallet has signing material saved; this tab cannot sign yet (Flow B · Safari P1-2).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P1-2
 */

/**
 * @param {number} walletSigningKeyCount
 * @param {boolean} hasTabSigningKeys
 */
export function walletOwnershipNotInTab(walletSigningKeyCount, hasTabSigningKeys) {
  return walletSigningKeyCount > 0 && !hasTabSigningKeys;
}
