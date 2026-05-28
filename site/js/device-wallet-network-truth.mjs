/**
 * A3: single source of truth for saved-card network chip + since-visit UI.
 * Written at end of each wallet poll; banner/inbox/glance read this only.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md § Fourth pass (A3)
 */

/** @typedef {'cache' | 'poll'} WalletNetworkTruthSource */

/**
 * @typedef {{
 *   chipStatus: string,
 *   scanKind: string | null,
 *   alertState: string | null,
 *   fetchedAt: number,
 *   source: WalletNetworkTruthSource,
 *   resolverConfirmed: boolean,
 * }} WalletNetworkTruthRow
 */

/** @type {Map<string, WalletNetworkTruthRow>} */
const truthByProfileId = new Map();

/** @returns {boolean} */
export function hasWalletNetworkTruthPoll() {
  for (const row of truthByProfileId.values()) {
    if (row.source === "poll" && row.resolverConfirmed) return true;
  }
  return false;
}

export function listWalletNetworkTruthPollProfileIds() {
  const ids = [];
  for (const [profileId, row] of truthByProfileId.entries()) {
    if (row.source === "poll" && row.resolverConfirmed && row.alertState != null) {
      ids.push(profileId);
    }
  }
  return ids;
}

export function resetWalletNetworkTruth() {
  truthByProfileId.clear();
}

/** @param {string} profileId */
export function clearWalletNetworkTruthForProfile(profileId) {
  if (!profileId) return;
  truthByProfileId.delete(profileId);
  if (truthByProfileId.size === 0) {
    /* no-op; map empty */
  }
}

/**
 * @param {string} profileId
 * @param {{ chipStatus: string, scanKind: string | null, alertState: string }} row
 */
export function setWalletNetworkTruthFromPoll(profileId, row) {
  if (!profileId || !row.alertState) return;
  truthByProfileId.set(profileId, {
    chipStatus: String(row.chipStatus || "checking"),
    scanKind: row.scanKind ?? null,
    alertState: row.alertState,
    fetchedAt: Date.now(),
    source: "poll",
    resolverConfirmed: true,
  });
}

/**
 * Cache-only poll row: chip from session cache, no since-visit authority.
 * @param {string} profileId
 * @param {{ chipStatus: string, scanKind: string | null }} row
 */
export function setWalletNetworkTruthFromCacheOnly(profileId, row) {
  if (!profileId) return;
  truthByProfileId.set(profileId, {
    chipStatus: String(row.chipStatus || "checking"),
    scanKind: row.scanKind ?? null,
    alertState: null,
    fetchedAt: Date.now(),
    source: "cache",
    resolverConfirmed: false,
  });
}

/**
 * @param {string} profileId
 * @returns {WalletNetworkTruthRow | null}
 */
export function getWalletNetworkTruth(profileId) {
  if (!profileId) return null;
  return truthByProfileId.get(profileId) ?? null;
}

/** Chip status for hub row apply (SSOT); null when unknown. */
export function getWalletNetworkTruthChipStatus(profileId) {
  return getWalletNetworkTruth(profileId)?.chipStatus ?? null;
}

/** @param {string} profileId */
export function isWalletNetworkTruthPollConfirmed(profileId) {
  const row = getWalletNetworkTruth(profileId);
  return row?.source === "poll" && row.resolverConfirmed === true;
}

/** @param {string} profileId */
export function getWalletNetworkTruthPollAlertState(profileId) {
  const row = getWalletNetworkTruth(profileId);
  if (!row || row.source !== "poll" || !row.resolverConfirmed) return null;
  return row.alertState;
}

/** @param {string} profileId */
export function getWalletNetworkTruthPollScanKind(profileId) {
  const row = getWalletNetworkTruth(profileId);
  if (!row || row.source !== "poll" || !row.resolverConfirmed) return null;
  if (!Object.prototype.hasOwnProperty.call(row, "scanKind")) return null;
  return row.scanKind ?? null;
}

/**
 * Chip states that must not show since-visit banner (in-flight or unreachable).
 * @param {string | null | undefined} chipStatus
 */
export function isSinceVisitBlockedChipStatus(chipStatus) {
  const chip = String(chipStatus || "").toLowerCase();
  return chip === "checking" || chip === "offline" || chip === "error";
}

/**
 * Per-profile since-visit suppress from SSOT (replaces cache-only reads for banner).
 * @param {string} profileId
 */
export function shouldSuppressCardDisabledSinceVisitFromTruth(profileId) {
  const row = getWalletNetworkTruth(profileId);
  if (!row || row.source !== "poll" || !row.resolverConfirmed) return true;
  return isSinceVisitBlockedChipStatus(row.chipStatus);
}

/**
 * Maps for since-visit UI from poll-backed truth only.
 * @param {Array<{ profile_id?: string }>} [entries]
 * @returns {{
 *   alertStateMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 * } | null}
 */
export function buildSinceVisitPollMapsFromTruth(entries = []) {
  if (!hasWalletNetworkTruthPoll()) return null;
  /** @type {Record<string, string>} */
  const alertStateMap = {};
  /** @type {Record<string, string | null>} */
  const scanKindMap = {};
  /** @type {Record<string, boolean>} */
  const resolverConfirmedMap = {};
  for (const entry of entries) {
    const pid = entry.profile_id;
    if (!pid || !isWalletNetworkTruthPollConfirmed(pid)) continue;
    const alertState = getWalletNetworkTruthPollAlertState(pid);
    if (alertState == null) continue;
    alertStateMap[pid] = alertState;
    scanKindMap[pid] = getWalletNetworkTruthPollScanKind(pid);
    resolverConfirmedMap[pid] = true;
  }
  if (Object.keys(resolverConfirmedMap).length === 0) return null;
  return { alertStateMap, scanKindMap, resolverConfirmedMap };
}
