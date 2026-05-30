/**
 * Wallet persistence error copy and classification (P0-3 · R3).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-3
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 */

export const WALLET_SAVE_STORAGE_FULL =
  "Could not save on this device — browser storage is full. Remove saved objects you no longer need, then save ownership again.";

export const WALLET_SAVE_FAILED =
  "Could not save ownership on this device. Try again, or export a backup before closing this tab.";

/**
 * @param {unknown} error
 * @returns {string}
 */
export function walletSaveErrorMessage(error) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  if (name === "QuotaExceededError") return WALLET_SAVE_STORAGE_FULL;
  return WALLET_SAVE_FAILED;
}

/**
 * @param {{ ok: true } | { error: string }} result
 * @returns {result is { ok: true }}
 */
export function walletSaveOk(result) {
  return result != null && typeof result === "object" && "ok" in result && result.ok === true;
}
