/**
 * Pure rules for quiet tab rehydrate (D10).
 * @see docs/QUIET_TAB_REHYDRATE.md
 */

/**
 * Plaintext signing rows only — `device_unlock` wrap rows need explicit WebAuthn (C2).
 * @see docs/CUSTODY_EASY_MODE.md § Mode-aware quiet rehydrate
 * @param {Array<{ owner_private_key_b58?: string, profile_id?: string }>} entries
 */
export function walletEntriesWithSigningKeys(entries) {
  return entries.filter((entry) => Boolean(entry?.owner_private_key_b58));
}

/** Alias — quiet rehydrate never copies wrapped rows silently. */
export const walletEntriesEligibleForQuietRehydrate = walletEntriesWithSigningKeys;

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
 * @param {Record<string, { profile_id?: string, updatedAt?: number }>} presenceMap
 * @param {string | null | undefined} targetProfileId
 * @param {string | null | undefined} thisTabId
 * @param {number} [now]
 */
export function quietRehydrateBlockedByOtherTabPresence(
  presenceMap,
  targetProfileId,
  thisTabId,
  now = Date.now()
) {
  const pid = typeof targetProfileId === "string" ? targetProfileId.trim() : "";
  const tabId = typeof thisTabId === "string" ? thisTabId.trim() : "";
  if (!pid || !presenceMap || typeof presenceMap !== "object") return false;
  for (const [id, entry] of Object.entries(presenceMap)) {
    if (tabId && id === tabId) continue;
    const rowProfile =
      typeof entry?.profile_id === "string" ? entry.profile_id.trim() : "";
    if (!rowProfile || rowProfile !== pid) continue;
    const updatedAt = typeof entry?.updatedAt === "number" ? entry.updatedAt : now;
    if (now - updatedAt > 10_000) continue;
    return true;
  }
  return false;
}

/**
 * On scan, only auto-rehydrate when the page is for the same card as the wallet row.
 * @param {Record<string, unknown> | null | undefined} targetEntry
 * @param {string | null | undefined} scanProfileId vouchee / scan-safety-header profile
 */
export function quietRehydrateBlockedOnScanForDifferentCard(targetEntry, scanProfileId) {
  const scanPid = typeof scanProfileId === "string" ? scanProfileId.trim() : "";
  if (!scanPid || !targetEntry) return false;
  const entryProfile =
    typeof targetEntry.profile_id === "string" ? targetEntry.profile_id.trim() : "";
  return entryProfile !== scanPid;
}

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
