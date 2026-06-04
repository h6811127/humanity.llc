/**
 * Hide scan owner-restore CTA when control is already loaded for this card.
 */
import { getTabSession } from "./device-keys.mjs";
import { walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { shouldHideScanOwnerRestoreCta } from "./scan-owner-restore-cta-core.mjs";

function profileIdFromScanHeader() {
  const header = document.getElementById("scan-safety-header");
  return header?.dataset.profileId?.trim() || null;
}

function syncOwnerRestoreCtaVisibility() {
  const el = document.getElementById("scan-owner-restore-cta");
  if (!(el instanceof HTMLElement)) return;
  const profileId = profileIdFromScanHeader();
  const walletSigningProfileIds = loadWallet()
    .filter((entry) => walletEntryHasSigningMaterial(entry))
    .map((entry) => String(entry.profile_id));
  const hidden = shouldHideScanOwnerRestoreCta({
    profileId,
    session: getTabSession(),
    walletSigningProfileIds,
  });
  el.hidden = hidden;
}

syncOwnerRestoreCtaVisibility();
window.addEventListener("hc-device-hub-changed", syncOwnerRestoreCtaVisibility);
