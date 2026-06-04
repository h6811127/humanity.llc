/**
 * Restore saved ownership into this tab (hub · wallet · scan).
 * @see docs/SAFARI_KEYS_CUSTODY.md P1-2
 */
import { openCardNowPage } from "./device-keys.mjs";
import {
  activateWalletEntryGated,
  activateWalletEntryGatedWithPinPrompt,
} from "./device-control-activation.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  pickWalletEntryForRestoreInTab,
  restoreInTabPlan,
} from "./device-ownership-restore-in-tab-core.mjs";
import { walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";

function signingWalletEntries() {
  return loadWallet().filter((entry) => walletEntryHasSigningMaterial(entry));
}

export function scrollToSavedObjectsOnDevice() {
  document.getElementById("device-hub-saved-group")?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

/**
 * Hub / wallet: open sole saved card or scroll to saved list.
 * @param {{ closeHubSheet?: boolean }} [opts]
 */
export function openRestoreControlInThisTab(opts = {}) {
  const signing = signingWalletEntries();
  if (opts.closeHubSheet) {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  }
  if (restoreInTabPlan(signing.length) === "open_card" && signing[0]) {
    openCardNowPage(signing[0]);
    return { ok: true, kind: "open_card" };
  }
  scrollToSavedObjectsOnDevice();
  return { ok: true, kind: "scroll_list" };
}

/**
 * Scan: activate wallet row in this tab (matches status-dot restore path).
 * @param {{ afterActivate?: () => void }} [opts]
 */
/**
 * Load saved ownership for a profile into this tab (created / view-only restore).
 * @param {string} profileId
 * @param {{ pin?: string }} [opts]
 */
export async function restoreProfileControlInThisTab(profileId, opts = {}) {
  const entry = findWalletEntryByProfileId(profileId);
  if (!entry) {
    return { ok: false, kind: "no_wallet", message: "No saved ownership for this card." };
  }
  const result = opts.pin
    ? await activateWalletEntryGated(entry, { pin: opts.pin })
    : await activateWalletEntryGatedWithPinPrompt(entry);
  if (!result.ok) {
    return { ok: false, kind: "activation_failed", ...result };
  }
  window.dispatchEvent(new Event("hc-device-hub-changed"));
  return { ok: true, kind: "activated" };
}

export async function activateRestoreControlInThisTab(opts = {}) {
  const existing =
    document.querySelector(".vouch-use-keys-here") ||
    document.querySelector("[data-cross-tab-use-keys]");
  if (existing instanceof HTMLElement) {
    existing.click();
    return { ok: true, kind: "delegated_click" };
  }

  const signing = signingWalletEntries();
  const entry = pickWalletEntryForRestoreInTab(signing, getDefaultVouchProfileId());
  if (!entry) {
    scrollToSavedObjectsOnDevice();
    return { ok: false, kind: "scroll_list" };
  }

  let result = await activateWalletEntryGated(entry);
  if (!result.ok && result.needsPin) {
    const pin = window.prompt("Enter PIN to take control in this tab:");
    if (pin != null && pin.trim()) {
      result = await activateWalletEntryGated(entry, { pin });
    }
  }
  if (!result.ok) return { ok: false, kind: "activation_failed" };

  window.dispatchEvent(new Event("hc-device-hub-changed"));
  opts.afterActivate?.();
  return { ok: true, kind: "activated" };
}
