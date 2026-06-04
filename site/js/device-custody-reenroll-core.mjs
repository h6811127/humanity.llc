/**
 * Cross-device device_unlock re-enroll (WS-CUSTODY C4 · K11).
 * @see docs/CUSTODY_EASY_MODE.md Phase 4
 * @see docs/KEY_LOSS_SAD_PATH_MATRIX.md K11
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  entryHasDeviceUnlockWrap,
  resolveEntryCustodyMode,
  walletEntryNeedsDeviceUnlockReenroll,
} from "./device-custody-mode-core.mjs";
import { sessionHasOwnerSigningKey } from "./device-custody-migrate-core.mjs";

export { walletEntryNeedsDeviceUnlockReenroll };

/**
 * After recovery import on another device — stale passkey wrap cannot unlock here.
 * @param {Record<string, unknown>} entry
 */
export function stripStaleDeviceUnlockWrapForRecoveryImport(entry) {
  if (!entry || typeof entry !== "object") return entry;
  if (resolveEntryCustodyMode(entry) !== CUSTODY_MODE_DEVICE_UNLOCK) return entry;
  if (typeof entry.owner_private_key_b58 === "string" && entry.owner_private_key_b58.trim()) {
    return entry;
  }
  if (!entryHasDeviceUnlockWrap(entry)) return entry;

  const next = { ...entry };
  delete next.wrapped_owner_key;
  next.device_unlock_reenroll_pending = true;
  next.custody_mode = CUSTODY_MODE_DEVICE_UNLOCK;
  return next;
}

/**
 * Backup import adds plaintext owner key — never keep stale wrap (wallet invariant).
 * @param {Record<string, unknown>} entry
 */
export function normalizeWalletEntryAfterBackupImport(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const hasOwner =
    typeof entry.owner_private_key_b58 === "string" && !!entry.owner_private_key_b58.trim();
  if (!hasOwner) return entry;
  if (resolveEntryCustodyMode(entry) !== CUSTODY_MODE_DEVICE_UNLOCK) return entry;
  if (!entryHasDeviceUnlockWrap(entry)) return entry;

  const next = { ...entry };
  delete next.wrapped_owner_key;
  delete next.device_unlock_reenroll_pending;
  next.custody_mode = CUSTODY_MODE_FULL_KEYS;
  return next;
}

/**
 * @param {{
 *   walletEntry?: Record<string, unknown> | null,
 *   session?: Record<string, unknown> | null,
 *   webAuthnAvailable?: boolean,
 * }} input
 */
export function deviceUnlockReenrollPanelState(input) {
  const walletEntry = input.walletEntry ?? null;
  const session = input.session ?? null;
  const webAuthnAvailable = input.webAuthnAvailable === true;
  const saved = !!(walletEntry && walletEntry.profile_id);
  const needsReenroll = saved && walletEntryNeedsDeviceUnlockReenroll(walletEntry);
  const hasOwnerSession = sessionHasOwnerSigningKey(session);

  return {
    showReenroll: needsReenroll,
    canReenroll: needsReenroll && hasOwnerSession && webAuthnAvailable,
    blockedReason: needsReenroll
      ? !hasOwnerSession
        ? "need_owner_backup"
        : !webAuthnAvailable
          ? "webauthn_unavailable"
          : null
      : null,
  };
}
