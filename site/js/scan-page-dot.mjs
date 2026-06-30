/**
 * Progressive viewer device dot on public scan pages (Phase 8).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md
 */
import { setRefreshStatusSurfaces } from "./device-chrome-refresh.mjs?v=56";
import {
  describeDotState,
  scanDeviceStateFromContext,
  scanWalletKeysNotInTab,
  dotClassList,
  dotStateKey,
  dotTransitionKey,
  hasStewardVerification,
} from "./device-dot-state-core.mjs?v=56";
import { fetchResolverHealth } from "./device-network-health.mjs";
import { setResolverHealthStatusForSinceVisit } from "./device-wallet-since-visit-gate.mjs?v=94";
import { savedControlNeedsDeviceUnlockCopy, savedControlNeedsDeviceUnlockReenrollCopy } from "./device-custody-mode-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { activateRestoreControlInThisTab } from "./device-ownership-restore-in-tab.mjs";
import { openHubFromChrome } from "./device-status-core.mjs";
import { scrollToHubImportForm } from "./device-wallet-corrupt-core.mjs";
import { isWalletSaved, loadWallet, loadWalletSummary } from "./device-wallet.mjs";
import { getInboxOverlayCounts } from "./device-inbox.mjs?v=56";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  scanCrossTabOverlayCount,
  scanDotMarkFirstDevice,
  scanDotOverlayFromCounts,
  scanPageDotEligible,
  shouldScanNoneEligibleAttentionPulse,
} from "./scan-page-dot-core.mjs";
import {
  isScanOperatorFamiliar,
  syncScanOperatorFamiliarFromWallet,
} from "./scan-operator-familiar.mjs";
import { getCrossTabScanSnapshot } from "./device-cross-tab-state.mjs";
import { actOnOtherTabKeys } from "./device-notice-nav.mjs";
import {
  renderScanDotExplainerHtml,
  scanGlancePrimaryAction,
  scanPageDotAriaLabel,
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
const RESOLVER_HEALTH_CHANGED = "hc-resolver-health-changed";

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
  return loadWalletSummary().stewardReady;
}

function hasCreatedKeys() {
  const session = getTabSession();
  return Boolean(session?.owner_private_key_b58);
}

function scanCrossTabNoticeCount() {
  return scanCrossTabOverlayCount(getCrossTabScanSnapshot(), hasCreatedKeys());
}

function computeEligible() {
  const { profileId, qrId } = readScanContext();
  const summary = loadWalletSummary();
  syncScanOperatorFamiliarFromWallet(summary.count);
  const overlayCounts = getInboxOverlayCounts();
  const crossTabNotice = scanCrossTabNoticeCount();
  return scanPageDotEligible({
    profileId,
    qrId,
    hasCreatedKeys: hasCreatedKeys(),
    walletSigningKeyCount: summary.signingKeyCount,
    crossTabNotice,
    liveProofPending: overlayCounts.liveProofPending,
    operatorDeviceFamiliar: isScanOperatorFamiliar(),
  });
}

function resolveNetworkForDot() {
  if (navigator.onLine === false) return "offline";
  return networkStatus;
}

function dotOverlayState() {
  const counts = getInboxOverlayCounts();
  const crossTabNotice = scanCrossTabNoticeCount();
  return scanDotOverlayFromCounts(counts, crossTabNotice);
}

function scanDeviceContext() {
  const session = getTabSession();
  const hasTabSigningKeys = Boolean(session?.owner_private_key_b58);
  const summary = loadWalletSummary();
  const { profileId } = readScanContext();
  const wallet = loadWallet();
  const stewardReady =
    summary.stewardReady ||
    Boolean(hasTabSigningKeys && hasStewardVerification(session));
  const device = scanDeviceStateFromContext({
    unsavedTabKeys: hasUnsavedTabKeys(),
    stewardReady,
    hasTabSigningKeys,
  });
  const walletKeysNotInTab = scanWalletKeysNotInTab(
    summary.signingKeyCount,
    hasTabSigningKeys
  );
  const walletNeedsDeviceUnlock = savedControlNeedsDeviceUnlockCopy(wallet, profileId);
  const walletNeedsDeviceUnlockReenroll = savedControlNeedsDeviceUnlockReenrollCopy(
    wallet,
    profileId
  );
  return {
    device,
    walletKeysNotInTab,
    walletNeedsDeviceUnlock,
    walletNeedsDeviceUnlockReenroll,
    stewardReady,
    summary,
  };
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

function useKeysOnScan() {
  void activateRestoreControlInThisTab({
    returnUrl: location.href,
  });
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

function renderScanGlanceContent(network, device, overlay, ctx) {
  const explainer = scanGlanceExplainer();
  if (!explainer) return;
  const descriptor = describeDotState(network, device, overlay, {
    stewardReady: ctx.stewardReady,
    queueUrl: null,
    pageKind: "scan",
    singleSavedCardWithKeys: ctx.summary.signingKeyCount === 1,
    walletKeysNotInTab: ctx.walletKeysNotInTab,
    walletNeedsDeviceUnlock: ctx.walletNeedsDeviceUnlock,
    walletNeedsDeviceUnlockReenroll: ctx.walletNeedsDeviceUnlockReenroll,
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
    return;
  }
  if (action === "import_backup") {
    openHubFromChrome();
    scrollToHubImportForm();
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
    const link = e.target.closest(".scan-page-dot-glance-action[href]");
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
  const ctx = scanDeviceContext();
  const { device, walletKeysNotInTab } = ctx;
  const dotDevice = scanDotMarkFirstDevice(device);
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
  for (const cls of dotClassList(network, dotDevice, overlay)) {
    dot.classList.add(cls);
  }
  if (network === "ok" && dotDevice === "none") {
    dot.classList.add(SCAN_DOT_MODIFIER);
  }

  applyNoneAttentionPulse(dot, network, dotDevice, overlay);
  lastDotTransitionKey = dotTransitionKey(network, dotDevice, overlay);
  lastDotSnapshot = { device: dotDevice };

  const stateKey = dotStateKey(network, dotDevice);
  dot.dataset.dotState = stateKey;
  dot.dataset.dotOverlay = overlay;
  btn.setAttribute(
    "aria-label",
    scanPageDotAriaLabel({
      networkResolved,
      online: navigator.onLine !== false,
      network,
      device,
      overlay,
      walletKeysNotInTab,
    })
  );

  renderScanGlanceContent(network, device, overlay, ctx);
}

function setScanResolverHealth(status) {
  setResolverHealthStatusForSinceVisit(status);
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_CHANGED, { detail: { networkStatus: status } })
  );
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
    setScanResolverHealth(networkStatus);
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
    setScanResolverHealth(networkStatus);
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

/** Path 2: one-shot mark Settle synced with live check (docs/SCAN_PAGE_TRUST_UI.md). */
window.addEventListener("hc-scan-live-check-settled", (event) => {
  if (event.detail?.instant || prefersReducedMotion()) return;
  const btn = scanDotBtn();
  if (!btn) return;
  btn.classList.add("scan-page-dot--settle");
  btn.addEventListener(
    "animationend",
    () => btn.classList.remove("scan-page-dot--settle"),
    { once: true }
  );
});
window.addEventListener("hc-vouch-ready-changed", refreshScanPageDot);
// Cross-tab streak: device-chrome-refresh refreshes dot after banner render.
window.addEventListener("hc-live-control-inbox-changed", refreshScanPageDot);
window.addEventListener("storage", (e) => {
  if (
    e.key === "hc_created" ||
    e.key === "hc_wallet" ||
    e.key === "hc_default_vouch_profile_id"
  ) {
    refreshScanPageDot();
  }
});
