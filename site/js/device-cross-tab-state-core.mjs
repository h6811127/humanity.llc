/**
 * Pure cross-tab notification state - fingerprint-stable show, immediate hide.
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 1
 */

export const CROSS_TAB_MIN_SHOW_STREAK = 2;

/**
 * Stable key for a set of other-tab presence rows.
 * @param {Array<{ tabId: string, profile_id: string }>} entries
 * @returns {string}
 */
export function crossTabPresenceFingerprint(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return "";
  return entries
    .map((e) => `${String(e.tabId)}:${String(e.profile_id)}`)
    .sort()
    .join("|");
}

/**
 * One inbox lane (generic cross-tab or orphan) after a presence read.
 * @param {{
 *   rawEntries?: Array<{ tabId: string, profile_id: string }>,
 *   tabNoticeCount?: number,
 *   shouldShow: (rawCount: number, tabNoticeCount: number) => boolean,
 *   previousStreak?: number,
 *   previousFingerprint?: string | null,
 *   minStreak?: number,
 * }} input
 * @returns {{
 *   show: boolean,
 *   streak: number,
 *   fingerprint: string | null,
 *   entries: Array<{ tabId: string, profile_id: string }>,
 * }}
 */
export function stableCrossTabLaneAfterRead(input) {
  const {
    rawEntries = [],
    tabNoticeCount = 0,
    shouldShow,
    previousStreak = 0,
    previousFingerprint = null,
    minStreak = CROSS_TAB_MIN_SHOW_STREAK,
  } = input;

  const rawCount = rawEntries.length;
  if (!shouldShow(rawCount, tabNoticeCount) || rawCount <= 0) {
    return { show: false, streak: 0, fingerprint: null, entries: [] };
  }

  const fingerprint = crossTabPresenceFingerprint(rawEntries);
  const sameFingerprint =
    typeof previousFingerprint === "string" &&
    previousFingerprint.length > 0 &&
    previousFingerprint === fingerprint;
  const streak = sameFingerprint ? previousStreak + 1 : 1;
  const show = streak >= minStreak;

  return {
    show,
    streak,
    fingerprint,
    entries: show ? rawEntries : [],
  };
}

/**
 * @typedef {object} CrossTabNotificationState
 * @property {boolean} showGeneric
 * @property {boolean} showOrphan
 * @property {Array<{ tabId: string, profile_id: string }>} genericEntries
 * @property {Array<{ tabId: string, profile_id: string }>} orphanEntries
 * @property {string | null} genericFingerprint
 * @property {string | null} orphanFingerprint
 * @property {number} genericStreak
 * @property {number} orphanStreak
 * @property {number} badgeContribution
 * @property {string} fingerprint Combined fingerprint for diagnostics
 */

/**
 * @param {{
 *   tabNoticeCount?: number,
 *   genericRaw?: Array<{ tabId: string, profile_id: string }>,
 *   orphanRaw?: Array<{ tabId: string, profile_id: string }>,
 *   genericStreak?: number,
 *   genericPreviousFingerprint?: string | null,
 *   orphanStreak?: number,
 *   orphanPreviousFingerprint?: string | null,
 *   shouldShowGeneric?: (rawCount: number, tabNoticeCount: number) => boolean,
 *   shouldShowOrphan?: (rawCount: number, tabNoticeCount: number) => boolean,
 * }} input
 * @returns {CrossTabNotificationState}
 */
export function computeCrossTabNotificationState(input) {
  const {
    tabNoticeCount = 0,
    genericRaw = [],
    orphanRaw = [],
    genericStreak = 0,
    genericPreviousFingerprint = null,
    orphanStreak = 0,
    orphanPreviousFingerprint = null,
    shouldShowGeneric = (n, t) => t === 0 && n > 0,
    shouldShowOrphan = (n, t) => t === 0 && n > 0,
  } = input;

  const generic = stableCrossTabLaneAfterRead({
    rawEntries: genericRaw,
    tabNoticeCount,
    shouldShow: shouldShowGeneric,
    previousStreak: genericStreak,
    previousFingerprint: genericPreviousFingerprint,
  });

  const orphan = stableCrossTabLaneAfterRead({
    rawEntries: orphanRaw,
    tabNoticeCount,
    shouldShow: shouldShowOrphan,
    previousStreak: orphanStreak,
    previousFingerprint: orphanPreviousFingerprint,
  });

  const badgeContribution =
    (generic.show ? genericRaw.length : 0) + (orphan.show ? orphanRaw.length : 0);

  return {
    showGeneric: generic.show,
    showOrphan: orphan.show,
    genericEntries: generic.entries,
    orphanEntries: orphan.entries,
    genericFingerprint: generic.fingerprint,
    orphanFingerprint: orphan.fingerprint,
    genericStreak: generic.streak,
    orphanStreak: orphan.streak,
    badgeContribution,
    fingerprint: generic.fingerprint || orphan.fingerprint || "",
  };
}
