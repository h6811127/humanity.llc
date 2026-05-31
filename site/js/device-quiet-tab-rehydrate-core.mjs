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
 * @param {string | null | undefined} [excludeProfileId] never auto-load this profile (e.g. scan vouchee)
 * @returns {Record<string, unknown> | null}
 */
export function resolveQuietTabRehydrateTarget(
  entries,
  lastActiveProfileId,
  excludeProfileId = null
) {
  const exclude =
    typeof excludeProfileId === "string" && excludeProfileId.trim()
      ? excludeProfileId.trim()
      : null;
  const signing = walletEntriesWithSigningKeys(entries).filter(
    (entry) => !exclude || entry.profile_id !== exclude
  );
  if (signing.length === 0) return null;
  if (signing.length === 1) return signing[0];
  if (lastActiveProfileId && lastActiveProfileId !== exclude) {
    const match = signing.find((entry) => entry.profile_id === lastActiveProfileId);
    if (match) return match;
  }
  return signing[0] ?? null;
}

/**
 * Block silent rehydrate when the user opened a specific card URL (view-only / restore UX).
 * @param {Record<string, unknown> | null | undefined} targetEntry
 * @param {string | null | undefined} urlProfileId profile_id from location.search
 */
export function quietRehydrateBlockedForUrlProfile(targetEntry, urlProfileId) {
  const url = typeof urlProfileId === "string" ? urlProfileId.trim() : "";
  if (!url || !targetEntry) return false;
  const entryProfile =
    typeof targetEntry.profile_id === "string" ? targetEntry.profile_id.trim() : "";
  return entryProfile !== url;
}

/**
 * @param {{
 *   hasTabControl?: boolean,
 *   signingWalletCount?: number,
 *   targetEntry?: Record<string, unknown> | null,
 *   requiresUnlock?: boolean,
 *   quietRehydrateEnabled?: boolean,
 *   urlProfileId?: string | null,
 * }} input
 */
export function shouldQuietTabRehydrate(input) {
  const {
    hasTabControl = false,
    signingWalletCount = 0,
    targetEntry = null,
    requiresUnlock = false,
    quietRehydrateEnabled = true,
    urlProfileId = null,
  } = input;
  if (hasTabControl || !targetEntry || requiresUnlock) return false;
  if (quietRehydrateBlockedForUrlProfile(targetEntry, urlProfileId)) return false;
  if (signingWalletCount === 1) return true;
  if (signingWalletCount > 1) return quietRehydrateEnabled;
  return false;
}

/**
 * Shell cross-tab entries to hide after quiet rehydrate (D10 Tier 3).
 * Keeps unsaved-only-other-tab rows for other profiles.
 *
 * @param {Array<{ profile_id?: string }>} entries
 * @param {{ quietRehydratedProfileId?: string | null, thisTabProfileId?: string | null }} ctx
 */
export function filterCrossTabEntriesAfterQuietRehydrate(entries, ctx = {}) {
  const quietRehydratedProfileId = ctx.quietRehydratedProfileId ?? null;
  const thisTabProfileId = ctx.thisTabProfileId ?? null;
  if (!quietRehydratedProfileId && !thisTabProfileId) return entries;
  return entries.filter((entry) => {
    const pid = entry?.profile_id;
    if (!pid) return false;
    if (quietRehydratedProfileId && pid === quietRehydratedProfileId) return false;
    if (thisTabProfileId && pid === thisTabProfileId) return false;
    return true;
  });
}
