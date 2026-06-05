/**
 * Landing device settings actions — manage QRs handoff, restore hub scroll.
 */
import { openCardNowPage } from "./device-keys.mjs";
import { getLastActiveProfileId } from "./device-quiet-tab-rehydrate-prefs.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  HUB_RESTORE_SCROLL_TARGET_ID,
  MANAGE_SAVED_QRS_FALLBACK_HREF,
  resolveManageSavedQrsWalletEntry,
} from "./landing-focus-settings-copy-core.mjs";

export function openLandingRestoreAccessHub() {
  window.dispatchEvent(
    new CustomEvent("hc-hub-expand-request", {
      detail: { targetId: HUB_RESTORE_SCROLL_TARGET_ID },
    })
  );
}

export function openLandingManageSavedQrs() {
  const entry = resolveManageSavedQrsWalletEntry(loadWallet(), getLastActiveProfileId());
  if (entry) {
    openCardNowPage(entry);
    return;
  }
  location.assign(MANAGE_SAVED_QRS_FALLBACK_HREF);
}

export function initLandingFocusSettingsActions() {
  document.getElementById("landing-manage-saved-qrs")?.addEventListener("click", () => {
    openLandingManageSavedQrs();
  });
  document.getElementById("landing-restore-access")?.addEventListener("click", () => {
    openLandingRestoreAccessHub();
  });
}

initLandingFocusSettingsActions();
