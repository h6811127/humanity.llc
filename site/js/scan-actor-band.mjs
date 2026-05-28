/**
 * L3 actor band on scan — appears after live check settles (Path 2 S3).
 * @see docs/SCAN_PAGE_TRUST_UI.md
 */
import { getTabSession } from "./device-keys.mjs";
import { getWalletCount } from "./device-wallet.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";
import {
  SCAN_ACTOR_BAND_REVEAL_MS,
  scanActorBandEligible,
} from "./scan-actor-band-core.mjs";

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

function revealBand(reduced) {
  const root = bandRoot();
  if (!root) return;
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

function scrollToVouch() {
  const target =
    document.querySelector(".scan-group-vouch") ||
    document.getElementById("vouch-ready") ||
    document.getElementById("vouch-submit");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindActions() {
  const root = bandRoot();
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  root.querySelector("#scan-actor-band-vouch")?.addEventListener("click", () => {
    scrollToVouch();
  });
}

function onLiveCheckSettled(event) {
  if (!gatherEligibility()) return;
  bindActions();
  revealBand(Boolean(event.detail?.instant) || prefersReducedMotion());
}

bindActions();
window.addEventListener("hc-scan-live-check-settled", onLiveCheckSettled);
