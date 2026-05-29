/**
 * Gated activation of saved ownership into hc_created (D6).
 */
import { activateWalletEntry, buildCreatedPageUrl } from "./device-keys.mjs";
import { navigateTo } from "./device-shell-motion.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { controlActivationRequiresUnlock } from "./device-control-activation-core.mjs";
import {
  getSignLock,
  unlockSignLock,
  verifyPinSignLock,
} from "./vouch-sign-lock.mjs";

/**
 * @param {string} profileId
 * @param {string} [pin]
 */
export async function ensureControlActivationUnlocked(profileId, pin) {
  if (!controlActivationRequiresUnlock(profileId)) {
    return { ok: true };
  }
  const lock = getSignLock(profileId);
  if (lock?.mode === "pin") {
    if (!pin?.trim()) {
      return {
        error: "PIN required to take control in this tab.",
        needsPin: true,
      };
    }
    const result = await verifyPinSignLock(profileId, pin);
    if (!result.ok) return result;
    return { ok: true };
  }
  return unlockSignLock(profileId);
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ pin?: string }} [opts]
 */
export async function activateWalletEntryGated(entry, opts = {}) {
  const profileId = typeof entry?.profile_id === "string" ? entry.profile_id : "";
  if (!profileId) return { error: "Missing profile id." };
  const unlock = await ensureControlActivationUnlocked(profileId, opts.pin);
  if (!unlock.ok) return unlock;
  activateWalletEntry(entry);
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null, pin?: string }} [opts]
 */
export async function openCardNowPageGated(entry, opts = {}) {
  if (!entry?.profile_id) return { error: "Missing profile id." };

  const saved =
    entry.owner_private_key_b58 != null
      ? entry
      : loadWallet().find((w) => w.profile_id === entry.profile_id) ?? null;

  const target = saved ?? entry;
  if (target?.owner_private_key_b58) {
    const result = await activateWalletEntryGated(target, { pin: opts.pin });
    if (!result.ok) return result;
  }

  const url = buildCreatedPageUrl(target, opts);
  if (!url) return { error: "Could not open card." };
  navigateTo(url.href);
  return { ok: true };
}
