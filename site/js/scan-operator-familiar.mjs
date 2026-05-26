/**
 * Scan progressive dot privacy: dynamic chrome only after this origin has used wallet.
 * @see docs/SCAN_PAGE_DEVICE_DOT.md § Progressive activation (Privacy)
 */

export const SCAN_OPERATOR_FAMILIAR_KEY = "hc_scan_operator_familiar";

/** @returns {boolean} */
export function isScanOperatorFamiliar() {
  try {
    return localStorage.getItem(SCAN_OPERATOR_FAMILIAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function markScanOperatorFamiliar() {
  try {
    localStorage.setItem(SCAN_OPERATOR_FAMILIAR_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Backfill familiar flag when wallet already has rows (existing operators).
 * @param {number} savedWalletCount
 */
export function syncScanOperatorFamiliarFromWallet(savedWalletCount) {
  if (savedWalletCount > 0) markScanOperatorFamiliar();
}
