/**
 * Restore-control-in-tab planning (hub · wallet · scan).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P1-2
 */

/**
 * @param {Array<{ profile_id?: string, owner_private_key_b58?: string | null }>} signingEntries
 * @param {string | null} [defaultProfileId]
 */
export function pickWalletEntryForRestoreInTab(signingEntries, defaultProfileId = null) {
  if (defaultProfileId) {
    const preferred = signingEntries.find(
      (e) => e.profile_id === defaultProfileId && e.owner_private_key_b58
    );
    if (preferred) return preferred;
  }
  return signingEntries.find((e) => e.owner_private_key_b58) ?? null;
}

/**
 * @param {number} signingEntryCount
 * @returns {"open_card" | "scroll_list"}
 */
export function restoreInTabPlan(signingEntryCount) {
  return signingEntryCount === 1 ? "open_card" : "scroll_list";
}
