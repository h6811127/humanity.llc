/**
 * Progressive viewer device dot on public scan pages (Phase 8).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md
 */
import { setRefreshStatusSurfaces } from "./device-chrome-refresh.mjs?v=38";
import {
  describeDotState,
  deviceStateFromContext,
  dotClassList,
  dotOverlayFromCounts,
  dotStateKey,
  dotTransitionKey,
  hasStewardVerification,
  shouldCelebrateStewardTransition,
  statusAriaLabel,
} from "./device-dot-state-core.mjs?v=38";
import { fetchResolverHealth } from "./device-network-health.mjs";
import { activateWalletEntry, getTabSession } from "./device-keys.mjs";
import { isWalletSaved, loadWallet } from "./device-wallet.mjs";
import { getInboxOverlayCounts } from "./device-inbox.mjs?v=38";
import { resolverApiOrigin } from "./hc-sign.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";
import {
  scanCrossTabOverlayCount,
  scanPageDotEligible,
  shouldScanNoneEligibleAttentionPulse,
} from "./scan-page-dot-core.mjs";
import { getCrossTabScanSnapshot } from "./device-cross-tab-state.mjs";
import { actOnOtherTabKeys, walletEntryForProfile } from "./device-notice-nav.mjs";
import {
  renderScanDotExplainerHtml,
  scanGlancePrimaryAction,
} from "./scan-page-dot-glance-core.mjs";

const NETWORK_CLASSES = [
  "pass-dot-status-network-ok",
  "pass-dot-status-network-degraded",
  "pass-dot-status-network-offline",
];
const DEVICE_CLASSES = [
  "pass-dot-status-device-none",
  "pass-dot-status-device-keys",
  "pass-dot-status-device-unsaved",
  "pass-dot-status-device-steward",
];
const OVERLAY_CLASSES = [
  "pass-dot-overlay-none",
  "pass-dot-overlay-proof_waiting",
  "pass-dot-overlay-cross_tab_keys",
  "pass-dot-overlay-card_disabled_since_visit",
];
const SCAN_DOT_MODIFIER = "scan-page-dot-device-none-eligible";
const SCAN_NONE_ATTENTION_CLASS = "scan-page-dot-none-attention";
const STEWARD_CELEBRATE_CLASS = "pass-dot-steward-celebrate";

/** @type {"ok" | "degraded" | "offline"} */
let networkStatus = "ok";
let healthFetchInFlight = false;
let networkResolved = false;
let glanceBound = false;
/** @type {string | null} */
let lastDotTransitionKey = null;
/** @type {{ device: "none" | "keys" | "unsaved" | "steward" } | null} */
let lastDotSnapshot = null;
let noneAttentionTimer = null;
let stewardCelebrateTimer = null;

function scanDotEl() {
  return document.getElementById("scan-page-dot");
}

function scanDotBtn() {
  return document.getElementById("scan-page-dot-btn");
}

function scanGlanceRoot() {
  return document.getElementById("scan-page-dot-glance");
}

function scanGlanceExplainer() {
  return document.getElementById("scan-page-dot-explainer");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readScanContext() {
  const header = document.getElementById("scan-safety-header");
  return {
    profileId: header?.dataset.profileId?.trim() || null,
    qrId: header?.dataset.qrId?.trim() || null,
  };
}

function hasUnsavedTabKeys() {
  const session = getTabSession();
  if (!session?.profile_id || !session?.owner_private_key_b58) return false;
  return !isWalletSaved(session.profile_id);
}

function hasStewardReadyKeys() {
  const session = getTabSession();
  if (session?.owner_private_key_b58 && hasStewardVerification(session)) {
    return true;
  }
  return loadWallet().some(
    (entry) => Boolean(entry?.owner_private_key_b58) && hasStewardVerification(entry)
  );
}

function hasCreatedKeys() {
  const session = getTabSession();
  return Boolean(session?.owner_private_key_b58);
}

function savedCardsWithSigningKeys() {
  return loadWallet().filter((entry) => Boolean(entry?.owner_private_key_b58));
}

function scanCrossTabNoticeCount() {
  return scanCrossTabOverlayCount(getCrossTabScanSnapshot(), hasCreatedKeys());
}

function computeEligible() {
  const { profileId, qrId } = readScanContext();
  const overlayCounts = getInboxOverlayCounts();
  const crossTabNotice = scanCrossTabNoticeCount();
  return scanPageDotEligible({
    profileId,
    qrId,
    hasCreatedKeys: hasCreatedKeys(),
    savedWalletCount: loadWallet().length,
    hasDefaultVouchProfile: Boolean(getDefaultVouchProfileId()),
    crossTabNotice,
    liveProofPending: overlayCounts.liveProofPending,
  });
}

function resolveNetworkForDot() {
  if (navigator.onLine === false) return "offline";
  return networkStatus;
}

function dotOverlayState() {
  const counts = getInboxOverlayCounts();
  const crossTabNotice = scanCrossTabNoticeCount();
  return dotOverlayFromCounts({
    liveProofPending: counts.liveProofPending,
    crossTabNotice,
    cardDisabledSinceVisit: counts.cardDisabledSinceVisit,
  });
}

function deviceState() {
  return deviceStateFromContext({
    unsavedTabKeys: hasUnsavedTabKeys(),
    stewardReady: hasStewardReadyKeys(),
    savedWalletCount: loadWallet().length,
  });
}

function isScanGlanceOpen() {
  const root = scanGlanceRoot();
  return !!root && !root.hidden;
}

export function closeScanGlance() {
  const root = scanGlanceRoot();
  const btn = scanDotBtn();
  if (!root || root.hidden) return;
  root.hidden = true;
  document.body.classList.remove("scan-page-dot-glance-open");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

export function setScanGlanceOpen(open) {
  const root = scanGlanceRoot();
  const btn = scanDotBtn();
  if (!root || !btn || !btn.classList.contains("scan-page-dot--dynamic")) return;
  if (!open) {
    closeScanGlance();
    return;
  }
  root.hidden = false;
  document.body.classList.add("scan-page-dot-glance-open");
  btn.setAttribute("aria-expanded", "true");
}

function toggleScanGlance() {
  setScanGlanceOpen(!isScanGlanceOpen());
}

function scrollScanTarget(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  });
}

function scrollToVouchOrLiveProof() {
  if (document.getElementById("vouch-row") && !document.getElementById("vouch-row")?.hidden) {
    scrollScanTarget("vouch-row");
    return;
  }
  if (document.getElementById("vouch-explainer")) {
    scrollScanTarget("vouch-explainer");
    return;
  }
  scrollScanTarget("live-control-row");
}

function walletEntryForUseKeysHere() {
  const defaultId = getDefaultVouchProfileId();
  if (defaultId) {
    const preferred = walletEntryForProfile(defaultId);
    if (preferred?.owner_private_key_b58) return preferred;
  }
  return savedCardsWithSigningKeys()[0] ?? null;
}

function useKeysOnScan() {
  const existing =
    document.querySelector(".vouch-use-keys-here") ||
    document.querySelector("[data-cross-tab-use-keys]");
  if (existing instanceof HTMLElement) {
    existing.click();
    return;
  }
  const entry = walletEntryForUseKeysHere();
  if (!entry) return;
  activateWalletEntry(entry);
  window.dispatchEvent(new Event("hc-device-hub-changed"));
  refreshScanPageDot();
  scrollToVouchOrLiveProof();
}

function focusOtherTabFromScan() {
  const snap = getCrossTabScanSnapshot();
  const entry = snap.entries[0];
  if (!entry) {
    const bannerBtn = document.querySelector(
      "#scan-cross-tab-banner [data-cross-tab-action]"
    );
    if (bannerBtn instanceof HTMLElement) {
      bannerBtn.click();
    }
    return;
  }
  actOnOtherTabKeys(entry);
}

function renderScanGlanceContent(network, device, overlay) {
  const explainer = scanGlanceExplainer();
  if (!explainer) return;
  const descriptor = describeDotState(network, device, overlay, {
    stewardReady: hasStewardReadyKeys(),
    queueUrl: null,
    pageKind: "scan",
    singleSavedCardWithKeys: savedCardsWithSigningKeys().length === 1,
  });
  const primary = scanGlancePrimaryAction(descriptor.action, overlay);
  explainer.innerHTML = renderScanDotExplainerHtml(descriptor, primary);
}

function runScanGlanceAction(action) {
  if (!action) return;
  closeScanGlance();
  if (action === "retry") {
    void refreshResolverHealth();
    return;
  }
  if (action === "scan_go_vouch") {
    scrollToVouchOrLiveProof();
    return;
  }
  if (action === "scan_scroll_live_proof") {
    scrollScanTarget("live-control-row");
    return;
  }
  if (action === "scan_scroll_notice") {
    const banner = document.getElementById("scan-cross-tab-banner");
    if (banner && !banner.hidden) {
      scrollScanTarget("scan-cross-tab-banner");
      return;
    }
    scrollToVouchOrLiveProof();
    return;
  }
  if (action === "scan_focus_other_tab") {
    focusOtherTabFromScan();
    return;
  }
  if (action === "scan_use_keys_here") {
    useKeysOnScan();
  }
}

function bindScanGlanceOnce() {
  if (glanceBound) return;
  glanceBound = true;

  const btn = scanDotBtn();
  const root = scanGlanceRoot();
  if (!btn || !root) return;

  btn.addEventListener("click", (e) => {
    if (!btn.classList.contains("scan-page-dot--dynamic")) return;
    e.preventDefault();
    toggleScanGlance();
  });

  root.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const link = e.target.closest(".scan-page-dot-explainer-action[href]");
    if (link instanceof HTMLAnchorElement) {
      closeScanGlance();
      return;
    }
    const actionEl = e.target.closest("[data-scan-dot-action]");
    if (!actionEl) return;
    e.preventDefault();
    runScanGlanceAction(actionEl.getAttribute("data-scan-dot-action"));
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isScanGlanceOpen()) return;
      const target = e.target;
      if (root.contains(target) || btn.contains(target)) return;
      closeScanGlance();
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeScanGlance();
  });
}

function clearNoneAttentionPulse(dot) {
  dot.classList.remove(SCAN_NONE_ATTENTION_CLASS);
  if (noneAttentionTimer != null) {
    clearTimeout(noneAttentionTimer);
    noneAttentionTimer = null;
  }
}

function applyNoneAttentionPulse(dot, network, device, overlay) {
  clearNoneAttentionPulse(dot);
  const nextKey = dotTransitionKey(network, device, overlay);
  const previousKey = lastDotTransitionKey;
  if (
    !shouldScanNoneEligibleAttentionPulse({
      previousKey,
      nextKey,
      reducedMotion: prefersReducedMotion(),
    })
  ) {
    return;
  }
  dot.classList.add(SCAN_NONE_ATTENTION_CLASS);
  noneAttentionTimer = window.setTimeout(() => {
    dot?.classList.remove(SCAN_NONE_ATTENTION_CLASS);
    noneAttentionTimer = null;
  }, 900);
}

function clearStewardCelebrate(dot) {
  dot.classList.remove(STEWARD_CELEBRATE_CLASS);
  if (stewardCelebrateTimer != null) {
    clearTimeout(stewardCelebrateTimer);
    stewardCelebrateTimer = null;
  }
}

function applyStewardCelebrate(dot, network, device) {
  clearStewardCelebrate(dot);
  const previousDevice = lastDotSnapshot?.device ?? null;
  if (
    !shouldCelebrateStewardTransition({
      network,
      previousDevice,
      nextDevice: device,
      reducedMotion: prefersReducedMotion(),
    })
  ) {
    return;
  }
  dot.classList.add(STEWARD_CELEBRATE_CLASS);
  stewardCelebrateTimer = window.setTimeout(() => {
    dot?.classList.remove(STEWARD_CELEBRATE_CLASS);
    stewardCelebrateTimer = null;
  }, 900);
}

function resetScanDotStatic(btn, dot) {
  closeScanGlance();
  lastDotTransitionKey = null;
  lastDotSnapshot = null;
  networkResolved = false;
  clearNoneAttentionPulse(dot);
  clearStewardCelebrate(dot);
  btn.classList.remove("scan-page-dot--dynamic", "scan-page-dot--resolving");
  btn.removeAttribute("aria-expanded");
  btn.removeAttribute("aria-haspopup");
  btn.removeAttribute("aria-controls");
  dot.className = "pass-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.removeAttribute("data-dot-state");
  dot.removeAttribute("data-dot-overlay");
  btn.setAttribute("aria-label", "humanity.llc home");
}

export function refreshScanPageDot() {
  const dot = scanDotEl();
  const btn = scanDotBtn();
  if (!dot || !btn) return;

  bindScanGlanceOnce();

  if (!computeEligible()) {
    resetScanDotStatic(btn, dot);
    return;
  }

  const network = resolveNetworkForDot();
  const device = deviceState();
  const overlay = dotOverlayState();

  btn.classList.add("scan-page-dot--dynamic");
  btn.classList.toggle(
    "scan-page-dot--resolving",
    !networkResolved && navigator.onLine !== false
  );
  btn.setAttribute("aria-haspopup", "dialog");
  btn.setAttribute("aria-controls", "scan-page-dot-glance");
  btn.setAttribute("aria-expanded", isScanGlanceOpen() ? "true" : "false");
  dot.removeAttribute("aria-hidden");

  dot.className = "pass-dot";
  dot.classList.remove(...NETWORK_CLASSES, ...DEVICE_CLASSES, ...OVERLAY_CLASSES);
  dot.classList.remove(SCAN_DOT_MODIFIER);
  for (const cls of dotClassList(network, device, overlay)) {
    dot.classList.add(cls);
  }
  if (network === "ok" && device === "none") {
    dot.classList.add(SCAN_DOT_MODIFIER);
  }

  applyNoneAttentionPulse(dot, network, device, overlay);
  applyStewardCelebrate(dot, network, device);
  lastDotTransitionKey = dotTransitionKey(network, device, overlay);
  lastDotSnapshot = { device };

  const stateKey = dotStateKey(network, device);
  dot.dataset.dotState = stateKey;
  dot.dataset.dotOverlay = overlay;
  btn.setAttribute(
    "aria-label",
    `${statusAriaLabel(network, device, overlay, { pageKind: "scan" })} Tap for details.`
  );

  renderScanGlanceContent(network, device, overlay);
}

async function refreshResolverHealth() {
  if (healthFetchInFlight) return;
  healthFetchInFlight = true;
  try {
    if (navigator.onLine === false) {
      networkStatus = "offline";
    } else {
      networkStatus = await fetchResolverHealth(resolverApiOrigin());
    }
  } finally {
    healthFetchInFlight = false;
    networkResolved = true;
    refreshScanPageDot();
  }
}

function onConnectivityChange() {
  if (navigator.onLine === false) {
    networkStatus = "offline";
    networkResolved = true;
    refreshScanPageDot();
    return;
  }
  networkResolved = false;
  void refreshResolverHealth();
}

setRefreshStatusSurfaces(refreshScanPageDot);
refreshScanPageDot();
void refreshResolverHealth();

window.addEventListener("online", onConnectivityChange);
window.addEventListener("offline", onConnectivityChange);
window.addEventListener("hc-vouch-ready-changed", refreshScanPageDot);
window.addEventListener("hc-device-hub-changed", refreshScanPageDot);
window.addEventListener("storage", (e) => {
  if (
    e.key === "hc_created" ||
    e.key === "hc_wallet" ||
    e.key === "hc_default_vouch_profile_id"
  ) {
    refreshScanPageDot();
  }
});
