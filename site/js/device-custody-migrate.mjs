/**
 * Wallet custody mode migration (WS-CUSTODY C3).
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  resolveEntryCustodyMode,
} from "./device-custody-mode-core.mjs";
import {
  buildFullKeysWalletEntryFromMigration,
  fullKeysMigrationAllowed,
} from "./device-custody-migrate-core.mjs";
import { enrollDeviceUnlockAndBuildWalletEntry } from "./device-custody-enroll.mjs";
import {
  findWalletEntryByProfileId,
  mergeWalletEntryFromSession,
  persistWalletEntry,
} from "./device-wallet.mjs";

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} session
 * @param {{ recoveryAcknowledged?: boolean }} [opts]
 */
export async function migrateSavedCardToFullKeys(profileId, session, opts = {}) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return { error: "Missing profile id." };

  const existing = findWalletEntryByProfileId(pid);
  if (!existing) return { error: "This card is not saved on this device." };
  if (resolveEntryCustodyMode(existing) !== CUSTODY_MODE_DEVICE_UNLOCK) {
    return { error: "Already using full control keys on this device." };
  }

  const ack = fullKeysMigrationAllowed({
    session,
    walletEntry: existing,
    recoveryAcknowledged: opts.recoveryAcknowledged === true,
  });
  if (!ack.ok) return ack;

  const merged = mergeWalletEntryFromSession(existing, session, existing.label ?? "");
  const shaped = buildFullKeysWalletEntryFromMigration(merged, session);
  if (!shaped.ok) return shaped;

  const saved = persistWalletEntry(shaped.entry);
  if ("error" in saved) return saved;

  session.custody_mode = CUSTODY_MODE_FULL_KEYS;
  return { ok: true, custody_mode: CUSTODY_MODE_FULL_KEYS };
}

/**
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 */
export async function migrateSavedCardToDeviceUnlock(session, label = "") {
  const profileId = typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  if (!profileId) return { error: "Missing profile id." };
  if (typeof session?.owner_private_key_b58 !== "string" || !session.owner_private_key_b58.trim()) {
    return { error: "Load signing keys in this tab before switching to device unlock." };
  }

  const existing = findWalletEntryByProfileId(profileId);
  if (!existing) return { error: "Save ownership on this device first." };
  if (resolveEntryCustodyMode(existing) === CUSTODY_MODE_DEVICE_UNLOCK) {
    return { error: "Already using This device (Face ID / Touch ID)." };
  }

  const result = await enrollDeviceUnlockAndBuildWalletEntry(
    session,
    label || existing.label || ""
  );
  if (!result.ok) {
    return result;
  }

  const saved = persistWalletEntry(result.entry);
  if ("error" in saved) return saved;

  session.custody_mode = CUSTODY_MODE_DEVICE_UNLOCK;
  return { ok: true, custody_mode: CUSTODY_MODE_DEVICE_UNLOCK };
}
