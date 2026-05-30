/**
 * L3 actor band on scan — appears after live check settles (Path 2 S3).
 * @see docs/SCAN_PAGE_TRUST_UI.md
 * @see docs/SAFARI_KEYS_CUSTODY.md P1-2 step 2
 */
import { getTabSession } from "./device-keys.mjs";
import {
  OWNERSHIP_NOT_IN_TAB_PROMPT,
  RESTORE_CONTROL_HERE,
  RESTORE_CONTROL_IN_THIS_APP,
} from "./device-ownership-copy-core.mjs";
import { walletOwnershipNotInTab } from "./device-ownership-not-in-tab-core.mjs";
import { gatherPwaSessionMismatch } from "./device-pwa-session-mismatch.mjs";
import { activateRestoreControlInThisTab } from "./device-ownership-restore-in-tab.mjs";
import { getWalletCount, loadWalletSummary } from "./device-wallet.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";
import {
  SCAN_ACTOR_BAND_REVEAL_MS,
  scanActorBandEligible,
} from "./scan-actor-band-core.mjs";
import { isIosWebKitUserAgent } from "./safari-itp-storage-notice-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  readStewardScanQueryParamFromSearch,
  shouldDeferScanActorBandForStewardHandoff,
} from "./scan-pwa-camera-handoff-core.mjs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scanContext() {
  const header = document.getElementById("scan-safety-header");
  return {
    profileId: header?.dataset.profileId?.trim() || null,
    qrId: header?.dataset.qrId?.trim() || null,
    scanActive: header?.dataset.scanActive === "1",
  };
}

function gatherEligibility() {
  const { profileId, qrId, scanActive } = scanContext();
  const session = getTabSession();
  return scanActorBandEligible({
    profileId,
    qrId,
    scanActive,
    hasCreatedKeys: Boolean(session?.owner_private_key_b58),
    savedWalletCount: getWalletCount(),
    hasDefaultVouchProfile: Boolean(getDefaultVouchProfileId()),
  });
}

function bandRoot() {
  return document.getElementById("scan-actor-band");
}

function scrollToVouch() {
  const target =
    document.querySelector(".scan-group-vouch") ||
    document.getElementById("vouch-ready") ||
    document.getElementById("vouch-submit");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncActorBandCopy() {
  const root = bandRoot();
  if (!root) return;

  const title = root.querySelector(".scan-actor-band-title");
  const lead = root.querySelector(".scan-actor-band-lead");
  const restoreBtn = document.getElementById("scan-actor-band-restore");
  const vouchBtn = document.getElementById("scan-actor-band-vouch");

  const session = getTabSession();
  const hasTabKeys = Boolean(session?.owner_private_key_b58);
  const signingCount = loadWalletSummary().signingKeyCount;
  const walletNotInTab = walletOwnershipNotInTab(signingCount, hasTabKeys);

  if (walletNotInTab) {
    const pwaMismatch = gatherPwaSessionMismatch();
    root.classList.add("scan-actor-band--restore-prompt");
    if (title) title.textContent = "Ownership on this device";
    if (lead) {
      lead.textContent = pwaMismatch?.detail ?? OWNERSHIP_NOT_IN_TAB_PROMPT;
    }
    if (restoreBtn) {
      restoreBtn.hidden = Boolean(pwaMismatch && !pwaMismatch.canRestoreInThisTab);
      restoreBtn.textContent = pwaMismatch?.canRestoreInThisTab
        ? RESTORE_CONTROL_IN_THIS_APP
        : RESTORE_CONTROL_HERE;
    }
    if (vouchBtn) vouchBtn.hidden = true;
    return;
  }

  root.classList.remove("scan-actor-band--restore-prompt");
  if (title) title.textContent = "Ownership on this device";
  if (lead) lead.textContent = "You can vouch or open your cards from here.";
  if (restoreBtn) restoreBtn.hidden = true;
  if (vouchBtn) vouchBtn.hidden = false;
}

function revealBand(reduced) {
  const root = bandRoot();
  if (!root) return;
  syncActorBandCopy();
  root.hidden = false;
  root.classList.remove("scan-actor-band--hidden");
  if (reduced) {
    root.classList.add("scan-actor-band--visible");
    return;
  }
  window.setTimeout(() => {
    root.classList.add("scan-actor-band--visible");
  }, SCAN_ACTOR_BAND_REVEAL_MS);
}

function bindActions() {
  const root = bandRoot();
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  root.querySelector("#scan-actor-band-vouch")?.addEventListener("click", () => {
    scrollToVouch();
  });
  root.querySelector("#scan-actor-band-restore")?.addEventListener("click", () => {
    void activateRestoreControlInThisTab({ afterActivate: scrollToVouch });
  });
}

function stewardHandoffDefersActorBand() {
  const session = getTabSession();
  return shouldDeferScanActorBandForStewardHandoff({
    stewardLanding: readStewardScanQueryParamFromSearch(location.search),
    isIosWebKit: isIosWebKitUserAgent(navigator.userAgent, navigator),
    standalone: readStandaloneModeFromWindow(window),
    hasTabKeys: Boolean(session?.owner_private_key_b58),
  });
}

function onLiveCheckSettled(event) {
  if (!gatherEligibility()) return;
  if (stewardHandoffDefersActorBand()) return;
  bindActions();
  revealBand(Boolean(event.detail?.instant) || prefersReducedMotion());
}

bindActions();
window.addEventListener("hc-scan-live-check-settled", onLiveCheckSettled);
window.addEventListener("hc-device-hub-changed", () => {
  if (!bandRoot() || bandRoot().hidden) return;
  syncActorBandCopy();
});
