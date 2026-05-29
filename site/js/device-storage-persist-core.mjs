/**
 * Request durable origin storage after ownership is saved (D11).
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md · docs/KEYS_CARDS_AND_VERIFICATION.md
 */

export const STORAGE_PERSIST_REQUESTED_KEY = "hc_storage_persist_requested_v1";

/**
 * @param {{ persist?: (() => Promise<boolean>) | undefined } | null | undefined} storage
 */
export function isStoragePersistApiAvailable(storage) {
  return typeof storage?.persist === "function";
}

/**
 * @param {string | null | undefined} stored localStorage flag
 */
export function storagePersistAlreadyRequested(stored) {
  return stored === "1";
}

/**
 * @param {{
 *   hasSigningKeysOnDevice?: boolean,
 *   persistApiAvailable?: boolean,
 *   alreadyRequested?: boolean,
 * }} input
 */
export function shouldRequestStoragePersist(input) {
  const {
    hasSigningKeysOnDevice = false,
    persistApiAvailable = false,
    alreadyRequested = false,
  } = input;
  if (!hasSigningKeysOnDevice || !persistApiAvailable || alreadyRequested) return false;
  return true;
}

/**
 * @param {boolean} granted
 * @returns {"1" | "0"}
 */
export function storagePersistRequestedFlagValue(granted) {
  return granted ? "1" : "0";
}
