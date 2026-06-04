/**
 * Unlock device_unlock wallet row → session signing material.
 */

import {
  buildDeviceUnlockGetOptions,
  parseWrappedOwnerKey,
  prfKeyBytesFromGetCredential,
} from "./device-custody-webauthn-core.mjs";
import {
  base64ToBytes,
  decryptOwnerPrivateKeyB58,
  importAesGcmKey,
} from "./device-custody-wrap-core.mjs";
import {
  entryHasDeviceUnlockWrap,
  walletEntryNeedsDeviceUnlock,
} from "./device-custody-mode-core.mjs";

/**
 * @param {Record<string, unknown>} entry
 */
export async function unlockWalletEntrySigningMaterial(entry) {
  if (!entry || typeof entry !== "object") {
    return { ok: false, error: "Missing wallet entry." };
  }
  if (typeof entry.owner_private_key_b58 === "string" && entry.owner_private_key_b58.trim()) {
    return { ok: true, owner_private_key_b58: entry.owner_private_key_b58 };
  }
  if (!entryHasDeviceUnlockWrap(entry)) {
    return { ok: false, error: "This card is not saved with device unlock on this browser." };
  }

  const wrap = parseWrappedOwnerKey(entry.wrapped_owner_key);
  if (!wrap) {
    return { ok: false, error: "Device unlock data is invalid or unsupported." };
  }

  const prfSalt = base64ToBytes(wrap.prf_salt);
  const options = buildDeviceUnlockGetOptions(wrap.credential_id, prfSalt);

  let credential;
  try {
    credential = /** @type {PublicKeyCredential | null} */ (
      await navigator.credentials.get({ publicKey: options })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message || "Device unlock was cancelled." };
  }
  if (!credential) {
    return { ok: false, error: "Device unlock was cancelled." };
  }

  const prfResult = prfKeyBytesFromGetCredential(credential, prfSalt);
  if (!prfResult.ok) {
    return { ok: false, error: prfResult.error };
  }

  const aesKey = await importAesGcmKey(prfResult.prfKeyBytes);
  const iv = base64ToBytes(wrap.iv);
  const ciphertext = base64ToBytes(wrap.ciphertext);

  try {
    const owner_private_key_b58 = await decryptOwnerPrivateKeyB58(aesKey, iv, ciphertext);
    if (!owner_private_key_b58.trim()) {
      return { ok: false, error: "Unlock failed — empty signing key." };
    }
    return { ok: true, owner_private_key_b58 };
  } catch {
    return { ok: false, error: "Unlock failed — could not decrypt signing key." };
  }
}

/**
 * Merge unlocked signing material into a session-shaped object from wallet entry.
 * @param {Record<string, unknown>} entry
 */
export async function unlockWalletEntryToSession(entry) {
  const unlock = await unlockWalletEntrySigningMaterial(entry);
  if (!unlock.ok) {
    return unlock;
  }
  const session = { ...entry, owner_private_key_b58: unlock.owner_private_key_b58 };
  return { ok: true, session };
}

export { walletEntryNeedsDeviceUnlock };
