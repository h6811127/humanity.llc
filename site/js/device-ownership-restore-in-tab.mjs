/**
 * Open controls for saved ownership (hub · wallet · scan).
 * Navigates to /created/ with gated unlock — no separate restore-in-tab UX.
 * @see docs/CORE_PRODUCT_LOOP.md § View-only deprecation (step 3)
 */
import { openCardNowPage } from "./device-keys.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  pickWalletEntryForRestoreInTab,
  restoreInTabPlan,
} from "./device-ownership-restore-in-tab-core.mjs";
import { walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
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
 * @param {Record<string, unknown> | null | undefined} entry
 * @param {{ returnUrl?: string | null, closeHubSheet?: boolean }} [opts]
 */
function openControlsForWalletEntry(entry, opts = {}) {
  if (!entry?.profile_id) return { ok: false, kind: "no_entry" };
  if (opts.closeHubSheet) {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  }
  openCardNowPage(entry, { returnUrl: opts.returnUrl ?? null });
  return { ok: true, kind: "open_controls" };
}

/**
 * Hub / wallet: open controls for sole saved card or scroll to saved list.
 * @param {{ closeHubSheet?: boolean, returnUrl?: string | null }} [opts]
 */
export function openRestoreControlInThisTab(opts = {}) {
  const signing = signingWalletEntries();
  if (opts.closeHubSheet) {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  }
  if (restoreInTabPlan(signing.length) === "open_card" && signing[0]) {
    return openControlsForWalletEntry(signing[0], opts);
  }
  scrollToSavedObjectsOnDevice();
  return { ok: true, kind: "scroll_list" };
}

/**
 * @param {string} profileId
 * @param {{ returnUrl?: string | null, closeHubSheet?: boolean }} [opts]
 */
export function openControlsForProfile(profileId, opts = {}) {
  const entry = findWalletEntryByProfileId(profileId);
  if (
    entry &&
    (walletEntryHasSigningMaterial(entry) || walletEntryNeedsDeviceUnlock(entry))
  ) {
    return openControlsForWalletEntry(entry, opts);
  }
  return { ok: false, kind: "no_wallet", message: "No saved ownership for this card." };
}

/**
 * Scan / dot: open controls for default or sole saved card (optional return URL).
 * @param {{ afterActivate?: () => void, returnUrl?: string | null, profileId?: string | null }} [opts]
 */
export async function activateRestoreControlInThisTab(opts = {}) {
  const signing = signingWalletEntries();
  const entry = opts.profileId
    ? findWalletEntryByProfileId(opts.profileId)
    : pickWalletEntryForRestoreInTab(signing, getDefaultVouchProfileId());
  if (
    !entry ||
    (!walletEntryHasSigningMaterial(entry) && !walletEntryNeedsDeviceUnlock(entry))
  ) {
    scrollToSavedObjectsOnDevice();
    return { ok: false, kind: "scroll_list" };
  }
  const result = openControlsForWalletEntry(entry, {
    returnUrl: opts.returnUrl ?? null,
  });
  opts.afterActivate?.();
  return result;
}

/**
 * @deprecated Alias — use openControlsForProfile
 */
export async function restoreProfileControlInThisTab(profileId, opts = {}) {
  return openControlsForProfile(profileId, opts);
}
