/**
 * Scan-page owner live-proof discovery — poll scope for the scanned profile only.
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 9
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md § Attending (own scan)
 */

/** Match /created/ signing-surface poll cadence. */
export const SCAN_LIVE_PROOF_OWNER_POLL_MS = 3000;

/**
 * Wallet row must match the scan URL's profile + qr_id.
 *
 * @param {string | null | undefined} profileId
 * @param {string | null | undefined} scanQrId
 * @param {Record<string, unknown> | null | undefined} entry
 * @param {(entry: Record<string, unknown>) => string | null | undefined} readEntryQrId
 */
export function scanLiveProofOwnerWalletEntryForScan(
  profileId,
  scanQrId,
  entry,
  readEntryQrId
) {
  if (!profileId || !scanQrId || !entry) return null;
  if (entry.profile_id !== profileId) return null;
  const entryQr = readEntryQrId(entry);
  if (!entryQr || entryQr !== scanQrId) return null;
  return entry;
}

/**
 * @param {{
 *   documentVisible: boolean,
 *   operatorFamiliar: boolean,
 *   profileId: string | null | undefined,
 *   scanQrId: string | null | undefined,
 *   walletEntry: Record<string, unknown> | null | undefined,
 *   resolverHealth?: 'ok' | 'degraded' | 'offline',
 * }} input
 */
export function scanLiveProofOwnerPollShouldRun(input) {
  if (!input.documentVisible) return false;
  if (!input.operatorFamiliar) return false;
  if (!input.profileId || !input.scanQrId) return false;
  if (!input.walletEntry) return false;
  if (input.resolverHealth && input.resolverHealth !== "ok") return false;
  return true;
}
