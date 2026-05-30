/**
 * Wallet persistence error copy and classification (P0-3 · R3 · RC-1 read-back).
 * @see docs/SAFARI_KEYS_CUSTODY.md P0-3
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-1
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 */

export const WALLET_SAVE_STORAGE_FULL =
  "Could not save on this device — browser storage is full. Remove saved objects you no longer need, then save ownership again.";

export const WALLET_SAVE_FAILED =
  "Could not save ownership on this device. Try again, or export a backup before closing this tab.";

/** RC-1: setItem appeared to succeed but read-back did not match. */
export const WALLET_SAVE_VERIFY_FAILED =
  "Could not verify ownership was saved on this device. Keep this tab open, try saving again, or export a backup before closing.";

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

/**
 * Confirm `localStorage` retained the exact wallet payload (RC-1).
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @param {string} storageKey
 * @param {string} expectedSerialized
 */
export function verifyWalletStorageWrite(storage, storageKey, expectedSerialized) {
  if (!storage || typeof storage.getItem !== "function") {
    return false;
  }
  try {
    return storage.getItem(storageKey) === expectedSerialized;
  } catch {
    return false;
  }
}
