/**
 * Pure scan page chrome dot helpers (Vitest-covered).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md
 */

import { dotOverlayFromCounts } from "./device-dot-state-core.mjs";

/**
 * Dynamic dot activates only when the viewer may sign / vouch on this scan.
 * Mark-first (docs/SCAN_PAGE_TRUST_UI.md): saved wallet rows alone do not
 * enable custody colors — only tab keys, signing keys in wallet, or urgent overlays.
 * @param {{
 *   profileId: string | null,
 *   qrId: string | null,
 *   hasCreatedKeys: boolean,
 *   walletSigningKeyCount: number,
 *   crossTabNotice: number,
 *   liveProofPending: number,
 *   operatorDeviceFamiliar: boolean,
 * }} input
 */
export function scanPageDotEligible(input) {
  if (!input.profileId || !input.qrId) return false;
  if (!input.operatorDeviceFamiliar) return false;
  if (input.hasCreatedKeys) return true;
  if (input.walletSigningKeyCount > 0) return true;
  if (input.crossTabNotice > 0) return true;
  if (input.liveProofPending > 0) return true;
  return false;
}

/**
 * Scan corner dot stays mark-first: never green (reads as object verified).
 * @param {"none" | "keys" | "unsaved" | "steward"} device
 */
export function scanDotMarkFirstDevice(device) {
  return device === "steward" ? "keys" : device;
}

/**
 * Scan overlays: proof_waiting + cross_tab_keys only (since-visit stays on shell/inbox).
 * @param {{ liveProofPending: number, cardDisabledSinceVisit: number }} counts
 * @param {number} crossTabNotice
 */
export function scanDotOverlayFromCounts(counts, crossTabNotice) {
  return dotOverlayFromCounts({
    liveProofPending: counts.liveProofPending,
    crossTabNotice,
    cardDisabledSinceVisit: 0,
  });
}

/**
 * One-shot hollow-ring attention when entering ok+none (not on every refresh).
 * @param {{ previousKey: string | null, nextKey: string, reducedMotion?: boolean }} opts
 */
export function shouldScanNoneEligibleAttentionPulse({
  previousKey,
  nextKey,
  reducedMotion = false,
}) {
  if (reducedMotion) return false;
  if (!nextKey.startsWith("ok:none:")) return false;
  if (previousKey === nextKey) return false;
  if (previousKey?.startsWith("ok:none:")) return false;
  return true;
}

/**
 * Cross-tab overlay on scan matches `#scan-cross-tab-banner` (hide when keys in this tab).
 * @param {{ show: boolean, entries: unknown[] }} scanSnapshot
 * @param {boolean} hasCreatedKeys
 */
export function scanCrossTabOverlayCount(scanSnapshot, hasCreatedKeys) {
  if (hasCreatedKeys) return 0;
  return scanSnapshot.show && scanSnapshot.entries.length > 0 ? 1 : 0;
}
