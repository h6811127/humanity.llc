/**
 * Pure custody migration rules (WS-CUSTODY C3).
 * @see docs/CUSTODY_EASY_MODE.md Phase 3
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  resolveEntryCustodyMode,
} from "./device-custody-mode-core.mjs";
import { ownershipBackupSeatbeltSatisfied } from "./created-first-session-gate-core.mjs";
import { deviceUnlockReenrollPanelState } from "./device-custody-reenroll-core.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function sessionHasOwnerSigningKey(session) {
  return typeof session?.owner_private_key_b58 === "string" && !!session.owner_private_key_b58.trim();
}

/**
 * @param {{
 *   walletEntry?: Record<string, unknown> | null,
 *   session?: Record<string, unknown> | null,
 *   webAuthnAvailable?: boolean,
 * }} input
 */
export function custodyMigrationPanelState(input) {
  const walletEntry = input.walletEntry ?? null;
  const session = input.session ?? null;
  const webAuthnAvailable = input.webAuthnAvailable === true;
  const saved = !!(walletEntry && walletEntry.profile_id);
  const custodyMode = saved ? resolveEntryCustodyMode(walletEntry) : CUSTODY_MODE_FULL_KEYS;
  const hasSessionKey = sessionHasOwnerSigningKey(session);
  const hasRecoverySeatbelt = ownershipBackupSeatbeltSatisfied(session, walletEntry);
  const reenroll = deviceUnlockReenrollPanelState({
    walletEntry,
    session,
    webAuthnAvailable,
  });

  return {
    showPanel: saved,
    custodyMode,
    custodyModeLabel:
      custodyMode === CUSTODY_MODE_DEVICE_UNLOCK
        ? "device_unlock"
        : "full_keys",
    canMigrateToFullKeys:
      saved &&
      custodyMode === CUSTODY_MODE_DEVICE_UNLOCK &&
      hasSessionKey &&
      !reenroll.showReenroll,
    canMigrateToDeviceUnlock:
      saved &&
      custodyMode === CUSTODY_MODE_FULL_KEYS &&
      hasSessionKey &&
      webAuthnAvailable,
    showReenrollDeviceUnlock: reenroll.showReenroll,
    canReenrollDeviceUnlock: reenroll.canReenroll,
    reenrollBlockedReason: reenroll.blockedReason,
    hasRecoverySeatbelt,
    blockedReason:
      saved && custodyMode === CUSTODY_MODE_DEVICE_UNLOCK && !hasSessionKey
        ? "unlock_required"
        : saved &&
            custodyMode === CUSTODY_MODE_FULL_KEYS &&
            !hasSessionKey
          ? "keys_required"
          : saved &&
              custodyMode === CUSTODY_MODE_FULL_KEYS &&
              hasSessionKey &&
              !webAuthnAvailable
            ? "webauthn_unavailable"
            : null,
  };
}

/**
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} session
 */
export function buildFullKeysWalletEntryFromMigration(existing, session) {
  const ownerKey = session?.owner_private_key_b58;
  if (typeof ownerKey !== "string" || !ownerKey.trim()) {
    return { ok: false, error: "Unlock in this tab first — signing key required." };
  }
  if (resolveEntryCustodyMode(existing) !== CUSTODY_MODE_DEVICE_UNLOCK) {
    return { ok: false, error: "This card is not saved with device unlock." };
  }

  const entry = {
    ...existing,
    custody_mode: CUSTODY_MODE_FULL_KEYS,
    owner_private_key_b58: ownerKey,
    has_signing_key: true,
  };
  delete entry.wrapped_owner_key;
  return { ok: true, entry };
}

/**
 * @param {{
 *   session?: Record<string, unknown> | null,
 *   walletEntry?: Record<string, unknown> | null,
 *   recoveryAcknowledged?: boolean,
 * }} input
 */
export function fullKeysMigrationAllowed(input) {
  const { session, walletEntry, recoveryAcknowledged = false } = input;
  if (recoveryAcknowledged) return { ok: true };
  if (ownershipBackupSeatbeltSatisfied(session, walletEntry)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "Save a recovery code or encrypted backup before switching to full control keys.",
  };
}
