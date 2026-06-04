/**
 * Resolve signing keys for a profile from tab session or saved wallet (with device_unlock).
 */
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
import { unlockWalletEntryToSession } from "./device-custody-unlock.mjs";
import { getTabSession } from "./device-keys.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} material
 * @returns {{ profileId: string; privateKeyBase58: string; publicKeyBase58: string } | null}
 */
function keysFromMaterial(material) {
  if (!material || typeof material !== "object") return null;
  const profileId =
    typeof material.profile_id === "string" ? material.profile_id.trim() : "";
  if (!profileId) return null;
  if (
    typeof material.owner_private_key_b58 === "string" &&
    typeof material.owner_public_key_b58 === "string"
  ) {
    return {
      profileId,
      privateKeyBase58: material.owner_private_key_b58,
      publicKeyBase58: material.owner_public_key_b58,
    };
  }
  if (
    typeof material.recovery_private_key_b58 === "string" &&
    typeof material.recovery_public_key_b58 === "string"
  ) {
    return {
      profileId,
      privateKeyBase58: material.recovery_private_key_b58,
      publicKeyBase58: material.recovery_public_key_b58,
    };
  }
  return null;
}

/**
 * Tab session first, then saved wallet row (prompts WebAuthn when device_unlock).
 * @param {string} profileId
 * @param {{ promptUnlock?: boolean }} [opts]
 */
export async function signingKeysForProfile(profileId, opts = {}) {
  const pid = profileId?.trim();
  if (!pid) return null;

  const tab = getTabSession();
  if (tab?.profile_id === pid) {
    const fromTab = keysFromMaterial(tab);
    if (fromTab) return fromTab;
  }

  const entry = findWalletEntryByProfileId(pid);
  if (!entry) return null;

  if (walletEntryNeedsDeviceUnlock(entry)) {
    if (opts.promptUnlock === false) return null;
    const unlocked = await unlockWalletEntryToSession(entry);
    if (!unlocked.ok) return null;
    return keysFromMaterial(unlocked.session);
  }

  return keysFromMaterial(entry);
}
