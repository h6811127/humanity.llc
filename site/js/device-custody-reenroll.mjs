/**
 * Re-enroll passkey on this device after recovery / new phone (WS-CUSTODY C4).
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  entryHasDeviceUnlockWrap,
  resolveEntryCustodyMode,
} from "./device-custody-mode-core.mjs";
import { enrollDeviceUnlockAndBuildWalletEntry } from "./device-custody-enroll.mjs";
import { walletEntryNeedsDeviceUnlockReenroll } from "./device-custody-reenroll-core.mjs";
import { findWalletEntryByProfileId, persistWalletEntry } from "./device-wallet.mjs";

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 */
export async function reEnrollDeviceUnlockForProfile(profileId, session, label = "") {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return { error: "Missing profile id." };

  const existing = findWalletEntryByProfileId(pid);
  if (!existing) return { error: "This card is not saved on this device." };
  if (resolveEntryCustodyMode(existing) !== CUSTODY_MODE_DEVICE_UNLOCK) {
    return { error: "This card is not using This device (Face ID / Touch ID)." };
  }
  if (!walletEntryNeedsDeviceUnlockReenroll(existing)) {
    if (entryHasDeviceUnlockWrap(existing)) {
      return { error: "Passkey already set up on this device." };
    }
    return { error: "Nothing to re-enroll for this card." };
  }
  if (typeof session?.owner_private_key_b58 !== "string" || !session.owner_private_key_b58.trim()) {
    return {
      error:
        "Import your encrypted backup in this tab first, then set up Face ID on this device.",
    };
  }

  const result = await enrollDeviceUnlockAndBuildWalletEntry(
    session,
    label || existing.label || ""
  );
  if (!result.ok) {
    return result;
  }

  const entry = {
    ...result.entry,
    recovery_public_key_b58: existing.recovery_public_key_b58,
    recovery_private_key_b58: existing.recovery_private_key_b58,
    recovery_key_acknowledged: existing.recovery_key_acknowledged,
    recovery_imported_at: existing.recovery_imported_at,
  };
  delete entry.device_unlock_reenroll_pending;

  const saved = persistWalletEntry(entry);
  if ("error" in saved) return saved;

  session.custody_mode = CUSTODY_MODE_DEVICE_UNLOCK;
  return { ok: true, custody_mode: CUSTODY_MODE_DEVICE_UNLOCK };
}
