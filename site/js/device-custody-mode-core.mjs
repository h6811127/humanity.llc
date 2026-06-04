/**
 * Hybrid custody mode — device_unlock vs full_keys (WS-CUSTODY C1).
 * @see docs/CUSTODY_EASY_MODE.md
 */

export const CUSTODY_MODE_DEVICE_UNLOCK = "device_unlock";
export const CUSTODY_MODE_FULL_KEYS = "full_keys";

export const WRAPPED_OWNER_KEY_VERSION = 1;

/** @typedef {{ version: number, credential_id: string, prf_salt: string, iv: string, ciphertext: string }} WrappedOwnerKeyV1 */

/**
 * @param {Record<string, unknown> | null | undefined} entry
 * @returns {string}
 */
export function resolveEntryCustodyMode(entry) {
  const mode = entry?.custody_mode;
  if (mode === CUSTODY_MODE_DEVICE_UNLOCK || mode === CUSTODY_MODE_FULL_KEYS) {
    return mode;
  }
  if (entry?.wrapped_owner_key && typeof entry.wrapped_owner_key === "object") {
    return CUSTODY_MODE_DEVICE_UNLOCK;
  }
  return CUSTODY_MODE_FULL_KEYS;
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function entryHasDeviceUnlockWrap(entry) {
  if (resolveEntryCustodyMode(entry) !== CUSTODY_MODE_DEVICE_UNLOCK) return false;
  const wrap = entry?.wrapped_owner_key;
  return !!(wrap && typeof wrap === "object" && wrap.credential_id && wrap.ciphertext);
}

/**
 * Wallet / hub — row represents saved control without plaintext owner key in storage.
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryCountsAsSigning(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.owner_private_key_b58 === "string" && entry.owner_private_key_b58.trim()) {
    return true;
  }
  return entryHasDeviceUnlockWrap(entry);
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryNeedsDeviceUnlock(entry) {
  return entryHasDeviceUnlockWrap(entry) && !entry?.owner_private_key_b58;
}

/**
 * @param {{
 *   custodyMode?: string,
 *   webAuthnAvailable?: boolean,
 *   organizerEnabled?: boolean,
 *   ephemeralBrowsing?: boolean,
 * }} input
 */
export function shouldDefaultDeviceUnlockAtCreate(input) {
  const {
    custodyMode,
    webAuthnAvailable = false,
    organizerEnabled = false,
    ephemeralBrowsing = false,
  } = input;
  if (custodyMode === CUSTODY_MODE_FULL_KEYS) return false;
  if (custodyMode === CUSTODY_MODE_DEVICE_UNLOCK) {
    return webAuthnAvailable && !organizerEnabled && !ephemeralBrowsing;
  }
  return webAuthnAvailable && !organizerEnabled && !ephemeralBrowsing;
}

/**
 * Strip private key material before persisting device_unlock wallet rows.
 * @param {Record<string, unknown>} entry
 */
export function stripPrivateKeysForDeviceUnlockWallet(entry) {
  const next = { ...entry };
  delete next.owner_private_key_b58;
  delete next.recovery_private_key_b58;
  delete next.organizer_private_key_b58;
  next.custody_mode = CUSTODY_MODE_DEVICE_UNLOCK;
  next.has_signing_key = true;
  return next;
}
