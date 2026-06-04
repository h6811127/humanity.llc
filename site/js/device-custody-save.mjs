/**
 * Route wallet save through hybrid custody (WS-CUSTODY C1).
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  resolveEntryCustodyMode,
  shouldDefaultDeviceUnlockAtCreate,
  stripPrivateKeysForDeviceUnlockWallet,
} from "./device-custody-mode-core.mjs";
import { saveSessionToWalletDeviceUnlock } from "./device-custody-enroll.mjs";
import { isDeviceUnlockWebAuthnAvailable } from "./device-custody-webauthn-core.mjs";
import {
  loadWallet,
  mergeWalletEntryFromSession,
  persistWalletEntry,
  saveSessionToWallet,
} from "./device-wallet.mjs";
import { isLocalStorageEphemeral } from "./private-browsing-detect-core.mjs";

/**
 * @param {Record<string, unknown>} session
 * @param {string} [label]
 * @param {{ custodyMode?: string }} [opts]
 */
export async function saveSessionToWalletWithCustody(session, label = "", opts = {}) {
  const profileId = typeof session?.profile_id === "string" ? session.profile_id : "";
  const existing = profileId ? loadWallet().find((entry) => entry.profile_id === profileId) : null;
  const mode = session.custody_mode ?? opts.custodyMode ?? resolveEntryCustodyMode(existing);

  if (existing && resolveEntryCustodyMode(existing) === CUSTODY_MODE_DEVICE_UNLOCK) {
    if (!profileId || !session?.owner_public_key_b58) {
      return { error: "Ownership not loaded in this tab." };
    }
    const merged = stripPrivateKeysForDeviceUnlockWallet(
      mergeWalletEntryFromSession(existing, session, label)
    );
    return persistWalletEntry(merged);
  }

  const useDeviceUnlock = shouldDefaultDeviceUnlockAtCreate({
    custodyMode: mode,
    webAuthnAvailable: isDeviceUnlockWebAuthnAvailable(),
    organizerEnabled: Boolean(session?.organizer_private_key_b58),
    ephemeralBrowsing: isLocalStorageEphemeral(),
  });

  if (useDeviceUnlock) {
    const result = await saveSessionToWalletDeviceUnlock(session, label);
    if (result.ok) {
      session.custody_mode = CUSTODY_MODE_DEVICE_UNLOCK;
      return result;
    }
    if (result.fallbackFullKeys) {
      const fallback = saveSessionToWallet(session, label);
      if ("ok" in fallback && fallback.ok) {
        session.custody_mode = "full_keys";
      }
      return fallback;
    }
    return result;
  }

  return saveSessionToWallet(session, label);
}

export { saveSessionToWallet, saveSessionToWalletDeviceUnlock };
