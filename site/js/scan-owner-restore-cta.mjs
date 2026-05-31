/**
 * Hide scan owner-restore CTA when control is already loaded for this card.
 */
import { getTabSession } from "./device-keys.mjs";
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
    .filter((entry) => typeof entry?.owner_private_key_b58 === "string")
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
