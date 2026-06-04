/**
 * Gated activation of saved ownership into hc_created (D6).
 */
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
import { unlockWalletEntryToSession } from "./device-custody-unlock.mjs";
import { activateWalletEntry, buildCreatedPageUrl, getTabSession } from "./device-keys.mjs";
import { navigateTo } from "./device-shell-motion.mjs";
import {
  tabSessionHasSigningKeys,
  walletEntryHasSigningMaterial,
} from "./device-tab-session-core.mjs";
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

  let activationEntry = entry;
  if (walletEntryNeedsDeviceUnlock(entry)) {
    const unlocked = await unlockWalletEntryToSession(entry);
    if (!unlocked.ok) return unlocked;
    activationEntry = unlocked.session;
  }

  const unlock = await ensureControlActivationUnlocked(profileId, opts.pin);
  if (!unlock.ok) return unlock;
  activateWalletEntry(activationEntry);
  return { ok: true };
}

const CREATED_PIN_PROMPT =
  "Enter PIN to manage this card on this phone.";

/**
 * @param {Record<string, unknown>} entry
 * @param {{ pin?: string }} [opts]
 */
export async function activateWalletEntryGatedWithPinPrompt(entry, opts = {}) {
  let result = await activateWalletEntryGated(entry, opts);
  if (result.ok) return result;
  if (!result.needsPin || typeof window === "undefined") return result;
  const pin = window.prompt(CREATED_PIN_PROMPT);
  if (pin == null || !pin.trim()) return result;
  return activateWalletEntryGated(entry, { ...opts, pin: pin.trim() });
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ returnUrl?: string | null, pin?: string }} [opts]
 */
export async function openCardNowPageGated(entry, opts = {}) {
  if (!entry?.profile_id) return { error: "Missing profile id." };

  const saved =
    loadWallet().find((w) => w.profile_id === entry.profile_id) ?? entry;
  const target = saved ?? entry;
  const session = getTabSession();
  const sessionHasTargetKeys =
    tabSessionHasSigningKeys(session) && session?.profile_id === target.profile_id;

  if (
    target &&
    !sessionHasTargetKeys &&
    (tabSessionHasSigningKeys(target) ||
      walletEntryNeedsDeviceUnlock(target) ||
      walletEntryHasSigningMaterial(target))
  ) {
    const result = await activateWalletEntryGated(target, { pin: opts.pin });
    if (!result.ok) {
      const fallbackUrl = buildCreatedPageUrl(
        { profile_id: target.profile_id, qr_id: target.qr_id },
        opts
      );
      if (fallbackUrl) {
        navigateTo(fallbackUrl.href);
        return { ok: true, viewOnly: true, activationError: result };
      }
      return result;
    }
  }

  const url = buildCreatedPageUrl(getTabSession() ?? target, opts);
  if (!url) return { error: "Could not open card." };
  navigateTo(url.href);
  return { ok: true };
}
