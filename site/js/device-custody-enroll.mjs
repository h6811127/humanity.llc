/**
 * Enroll passkey + wrap owner key for device_unlock wallet save.
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  stripPrivateKeysForDeviceUnlockWallet,
  WRAPPED_OWNER_KEY_VERSION,
} from "./device-custody-mode-core.mjs";
import {
  buildDeviceUnlockCreateOptions,
  wrappedOwnerKeyFromCreateCredential,
} from "./device-custody-webauthn-core.mjs";
import {
  bytesToBase64,
  encryptOwnerPrivateKeyB58,
  importAesGcmKey,
} from "./device-custody-wrap-core.mjs";
import { walletEntryFromSession, persistWalletEntry } from "./device-wallet.mjs";

/**
 * @param {Record<string, unknown>} session
 * @param {string} label
 */
export async function enrollDeviceUnlockAndBuildWalletEntry(session, label = "") {
  const ownerKey = session?.owner_private_key_b58;
  if (typeof ownerKey !== "string" || !ownerKey.trim()) {
    return { ok: false, error: "Missing owner signing key for device unlock." };
  }
  const profileId = String(session?.profile_id ?? session?.card_id ?? "").trim();
  if (!profileId) {
    return { ok: false, error: "Missing profile id for device unlock." };
  }

  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const options = buildDeviceUnlockCreateOptions(profileId, prfSalt, label || profileId);

  let credential;
  try {
    credential = /** @type {PublicKeyCredential | null} */ (
      await navigator.credentials.create({ publicKey: options })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message || "Passkey enrollment was cancelled." };
  }
  if (!credential) {
    return { ok: false, error: "Passkey enrollment was cancelled." };
  }

  const prfResult = wrappedOwnerKeyFromCreateCredential(credential, prfSalt);
  if (!prfResult.ok) {
    return { ok: false, error: prfResult.error, fallbackFullKeys: true };
  }

  const aesKey = await importAesGcmKey(prfResult.prfKeyBytes);
  const { iv, ciphertext } = await encryptOwnerPrivateKeyB58(aesKey, ownerKey);

  /** @type {import("./device-custody-mode-core.mjs").WrappedOwnerKeyV1} */
  const wrapped_owner_key = {
    version: WRAPPED_OWNER_KEY_VERSION,
    credential_id: prfResult.credentialId,
    prf_salt: bytesToBase64(prfSalt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };

  let entry = walletEntryFromSession(session, label);
  entry = stripPrivateKeysForDeviceUnlockWallet({
    ...entry,
    custody_mode: CUSTODY_MODE_DEVICE_UNLOCK,
    wrapped_owner_key,
    has_signing_key: true,
  });

  return { ok: true, entry, custody_mode: CUSTODY_MODE_DEVICE_UNLOCK };
}

/**
 * @param {Record<string, unknown>} session
 * @param {string} label
 */
export async function saveSessionToWalletDeviceUnlock(session, label = "") {
  const result = await enrollDeviceUnlockAndBuildWalletEntry(session, label);
  if (!result.ok) {
    return result;
  }
  return persistWalletEntry(result.entry);
}
