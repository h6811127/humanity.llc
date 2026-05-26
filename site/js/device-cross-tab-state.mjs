/**
 * Browser cross-tab notification snapshot - holds streak between reads.
 * @see docs/CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md
 */
import {
  computeCrossTabNotificationState,
  stableCrossTabLaneAfterRead,
} from "./device-cross-tab-state-core.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";

let genericStreak = 0;
/** @type {string | null} */
let genericPreviousFingerprint = null;
let orphanStreak = 0;
/** @type {string | null} */
let orphanPreviousFingerprint = null;
let scanStreak = 0;
/** @type {string | null} */
let scanPreviousFingerprint = null;
let custodyListenersBound = false;

/** Reset fingerprint streaks (custody change, tests). */
export function invalidateCrossTabNotificationState() {
  genericStreak = 0;
  genericPreviousFingerprint = null;
  orphanStreak = 0;
  orphanPreviousFingerprint = null;
  scanStreak = 0;
  scanPreviousFingerprint = null;
}

/** @returns {import("./device-cross-tab-state-core.mjs").CrossTabNotificationState} */
export function getCrossTabNotificationState() {
  const notices = tabNoticeCount();
  const state = computeCrossTabNotificationState({
    tabNoticeCount: notices,
    genericRaw: getOtherTabsWithKeys(),
    orphanRaw: getOrphanRemovedTabsWithKeys(),
    genericStreak,
    genericPreviousFingerprint,
    orphanStreak,
    orphanPreviousFingerprint,
    shouldShowGeneric: shouldShowCrossTabKeysNotice,
    shouldShowOrphan: shouldShowOrphanRemovedKeysNotice,
  });

  genericStreak = state.genericStreak;
  genericPreviousFingerprint = state.genericFingerprint;
  orphanStreak = state.orphanStreak;
  orphanPreviousFingerprint = state.orphanFingerprint;

  return state;
}

/** Invalidate streak when wallet/session custody changes (Phase 1 partial - full list in rebuild Phase 4). */
export function startCrossTabNotificationState() {
  if (custodyListenersBound) return;
  custodyListenersBound = true;

  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_created") {
      invalidateCrossTabNotificationState();
    }
  });
  window.addEventListener("hc-device-hub-changed", invalidateCrossTabNotificationState);
  window.addEventListener("hc-wallet-removed-profiles-changed", invalidateCrossTabNotificationState);
}

/**
 * Stabilized scan-surface entries (includes saved profiles for vouch scan).
 * Scan pages need “keys in another tab” even when the profile is already saved on this device.
 *
 * @returns {{ show: boolean, entries: Array<{ tabId: string, profile_id: string, qr_id?: string | null, handle?: string | null, label?: string | null, updatedAt?: number }> }}
 */
export function getCrossTabScanSnapshot() {
  const notices = tabNoticeCount();
  const lane = stableCrossTabLaneAfterRead({
    rawEntries: getOtherTabsWithKeys({ includeSavedProfiles: true }),
    tabNoticeCount: notices,
    shouldShow: shouldShowCrossTabKeysNotice,
    previousStreak: scanStreak,
    previousFingerprint: scanPreviousFingerprint,
  });

  scanStreak = lane.streak;
  scanPreviousFingerprint = lane.fingerprint;
  return { show: lane.show, entries: lane.entries };
}
