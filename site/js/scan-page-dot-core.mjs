/**
 * Pure scan page chrome dot helpers (Vitest-covered).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md
 */

/**
 * Dynamic dot activates only when the viewer may sign / vouch on this scan.
 * @param {{
 *   profileId: string | null,
 *   qrId: string | null,
 *   hasCreatedKeys: boolean,
 *   savedWalletCount: number,
 *   hasDefaultVouchProfile: boolean,
 *   crossTabNotice: number,
 *   liveProofPending: number,
 * }} input
 */
export function scanPageDotEligible(input) {
  if (!input.profileId || !input.qrId) return false;
  if (input.hasCreatedKeys) return true;
  if (input.savedWalletCount > 0) return true;
  if (input.hasDefaultVouchProfile) return true;
  if (input.crossTabNotice > 0) return true;
  if (input.liveProofPending > 0) return true;
  return false;
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
