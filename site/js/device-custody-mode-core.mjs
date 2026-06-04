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
  if (walletEntryNeedsDeviceUnlockReenroll(entry)) return false;
  return entryHasDeviceUnlockWrap(entry) && !entry?.owner_private_key_b58;
}

/**
 * New phone / recovery import — stale passkey wrap removed; backup + re-enroll required (C4 · K11).
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryNeedsDeviceUnlockReenroll(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (resolveEntryCustodyMode(entry) !== CUSTODY_MODE_DEVICE_UNLOCK) return false;
  if (entryHasDeviceUnlockWrap(entry) && entry.device_unlock_reenroll_pending !== true) {
    return false;
  }
  return (
    entry.device_unlock_reenroll_pending === true ||
    (!entryHasDeviceUnlockWrap(entry) &&
      typeof entry.recovery_private_key_b58 === "string" &&
      !!entry.recovery_private_key_b58.trim())
  );
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

/**
 * Single saved card uses device_unlock (Layer 2 unlock copy).
 * @param {Array<Record<string, unknown>> | null | undefined} entries
 */
export function soleSavedEntryNeedsDeviceUnlock(entries) {
  if (!Array.isArray(entries)) return false;
  const signing = entries.filter((entry) => walletEntryCountsAsSigning(entry));
  if (signing.length !== 1) return false;
  return walletEntryNeedsDeviceUnlock(signing[0]);
}

/**
 * Profile-scoped unlock copy when known; otherwise sole saved device_unlock row.
 * @param {Array<Record<string, unknown>> | null | undefined} entries
 * @param {string | null | undefined} profileId
 */
export function savedControlNeedsDeviceUnlockCopy(entries, profileId = null) {
  if (!Array.isArray(entries)) return false;
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (pid) {
    const entry = entries.find((row) => row.profile_id === pid);
    if (entry && walletEntryCountsAsSigning(entry)) {
      return walletEntryNeedsDeviceUnlock(entry);
    }
    return false;
  }
  return soleSavedEntryNeedsDeviceUnlock(entries);
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} entries
 */
export function soleSavedEntryNeedsDeviceUnlockReenroll(entries) {
  if (!Array.isArray(entries)) return false;
  const controlRows = entries.filter(
    (entry) => walletEntryCountsAsSigning(entry) || walletEntryNeedsDeviceUnlockReenroll(entry)
  );
  if (controlRows.length !== 1) return false;
  return walletEntryNeedsDeviceUnlockReenroll(controlRows[0]);
}

/**
 * Profile-scoped re-enroll copy when known; otherwise sole saved pending row.
 * @param {Array<Record<string, unknown>> | null | undefined} entries
 * @param {string | null | undefined} profileId
 */
export function savedControlNeedsDeviceUnlockReenrollCopy(entries, profileId = null) {
  if (!Array.isArray(entries)) return false;
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (pid) {
    const entry = entries.find((row) => row.profile_id === pid);
    if (
      entry &&
      (walletEntryCountsAsSigning(entry) || walletEntryNeedsDeviceUnlockReenroll(entry))
    ) {
      return walletEntryNeedsDeviceUnlockReenroll(entry);
    }
    return false;
  }
  return soleSavedEntryNeedsDeviceUnlockReenroll(entries);
}
