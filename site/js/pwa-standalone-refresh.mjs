/**
 * Standalone PWA soft refresh on resume + pull-to-refresh + stale shell nudge.
 * @see docs/PWA_INSTALL.md § Standalone refresh & resume — Phases 6–9
 */

import { SITE_BUILD_META } from "./build-meta.mjs";
import { refreshDeviceChrome } from "./device-chrome-refresh.mjs";
import { fetchResolverHealthBuild } from "./device-network-health.mjs";
import { refreshDeviceHub } from "./device-hub-ui.mjs";
import { getWalletCount } from "./device-wallet.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  clampPullToRefreshDistance,
  pullToRefreshAllowed,
  pullToRefreshAtScrollTop,
  pullToRefreshIndicatorLabel,
  pullToRefreshPullState,
  pullToRefreshShouldCommit,
  PTR_THRESHOLD_PX,
  PTR_UPDATED_HIDE_MS,
  PWA_PTR_TIP_ID,
  PWA_REFRESH_ROW_ID,
  readPtrTipDismissed,
  readStandaloneModeFromWindow,
  readStaleShellDismissedForSha,
  runStandaloneSoftRefreshPipeline,
  shouldShowStandalonePtrTip,
  shouldShowStandaloneRefreshRow,
  shouldShowStaleShellNudge,
  shouldTriggerStandaloneResumeRefresh,
  STANDALONE_SOFT_REFRESH_DEBOUNCE_MS,
  writePtrTipDismissed,
  writeStaleShellDismissedForSha,
} from "./pwa-standalone-refresh-core.mjs";
import {
  standalonePtrTipCardHtml,
  standaloneRefreshRowHtml,
} from "./pwa-standalone-affordances-html.mjs";
import { pwaStaleShellBannerHtml } from "./pwa-stale-shell-banner-html.mjs";

const PTR_INDICATOR_ID = "device-ptr-indicator";
const STALE_SHELL_BANNER_ID = "device-pwa-stale-shell-banner";

let debounceTimer = null;
let resumeListenersBound = false;
let ptrListenersBound = false;
let ptrRefreshing = false;
let ptrUpdatedTimer = null;

/** @type {number | null} */
let ptrTouchStartY = null;
let ptrPullDistance = 0;
let ptrPulling = false;
let staleShellSyncInFlight = false;

function deviceStatusLoadError() {
  return document.getElementById("top-chrome")?.dataset.deviceStatusError === "1";
}

/**
 * @param {string} reason
 */
function runStandaloneSoftRefresh(reason) {
  runStandaloneSoftRefreshPipeline(
    {
      refreshDeviceHub,
      refreshDeviceChrome,
    },
    { reason }
  );
}

/**
 * @param {string} reason
 */
function scheduleStandaloneSoftRefresh(reason) {
  if (!readStandaloneModeFromWindow(window)) return;
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    runStandaloneSoftRefresh(reason);
    void syncStaleShellNudge();
  }, STANDALONE_SOFT_REFRESH_DEBOUNCE_MS);
}

function onVisibilityResume() {
  if (
    !shouldTriggerStandaloneResumeRefresh({
      standalone: readStandaloneModeFromWindow(window),
      eventKind: "visibilitychange",
      visibilityState: document.visibilityState,
    })
  ) {
    return;
  }
  scheduleStandaloneSoftRefresh("visibility");
}

/**
 * @param {PageTransitionEvent} ev
 */
function onPageShowResume(ev) {
  if (
    !shouldTriggerStandaloneResumeRefresh({
      standalone: readStandaloneModeFromWindow(window),
      eventKind: "pageshow",
      pageshowPersisted: ev.persisted,
    })
  ) {
    return;
  }
  scheduleStandaloneSoftRefresh("pageshow");
}

function bindResumeListeners() {
  if (resumeListenersBound) return;
  resumeListenersBound = true;
  document.addEventListener("visibilitychange", onVisibilityResume);
  window.addEventListener("pageshow", onPageShowResume);
}

function readPtrContext() {
  return {
    standalone: readStandaloneModeFromWindow(window),
    pathname: window.location.pathname,
    hubSheetOpen: document.body.classList.contains("device-hub-sheet-open"),
    inboxSheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
  };
}

function canStartPullToRefresh() {
  if (ptrRefreshing) return false;
  if (!pullToRefreshAllowed(readPtrContext())) return false;
  return pullToRefreshAtScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
}

function ensurePtrIndicator() {
  let el = document.getElementById(PTR_INDICATOR_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = PTR_INDICATOR_ID;
  el.className = "device-ptr-indicator";
  el.hidden = true;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  const label = document.createElement("span");
  label.className = "device-ptr-indicator__label";
  el.appendChild(label);
  document.body.appendChild(el);
  return el;
}

/**
 * @param {"idle" | "pulling" | "ready" | "refreshing" | "updated"} state
 * @param {number} [pullDistance]
 */
function renderPtrIndicator(state, pullDistance = 0) {
  const el = ensurePtrIndicator();
  const label = el.querySelector(".device-ptr-indicator__label");
  if (!(label instanceof HTMLElement)) return;

  if (state === "idle") {
    el.hidden = true;
    el.dataset.state = "idle";
    el.style.setProperty("--device-ptr-pull", "0px");
    label.textContent = "";
    return;
  }

  el.hidden = false;
  el.dataset.state = state;
  el.style.setProperty("--device-ptr-pull", `${pullDistance}px`);
  label.textContent = pullToRefreshIndicatorLabel(state);
}

function resetPtrPull() {
  ptrTouchStartY = null;
  ptrPullDistance = 0;
  ptrPulling = false;
  if (!ptrRefreshing) renderPtrIndicator("idle");
}

function finishRefreshFeedback() {
  ptrRefreshing = false;
  renderPtrIndicator("updated");
  if (ptrUpdatedTimer != null) clearTimeout(ptrUpdatedTimer);
  ptrUpdatedTimer = window.setTimeout(() => {
    ptrUpdatedTimer = null;
    resetPtrPull();
    void syncStaleShellNudge();
    syncStandaloneAffordances();
  }, PTR_UPDATED_HIDE_MS);
}

function executeManualStandaloneRefresh() {
  if (ptrRefreshing) return;
  if (
    !shouldShowStandaloneRefreshRow({
      standalone: readStandaloneModeFromWindow(window),
      pathname: window.location.pathname,
      savedCardCount: getWalletCount(),
    })
  ) {
    return;
  }
  ptrRefreshing = true;
  renderPtrIndicator("refreshing");
  runStandaloneSoftRefresh("manual");
  window.setTimeout(() => finishRefreshFeedback(), 180);
}

function executePullToRefresh() {
  if (ptrRefreshing || !pullToRefreshAllowed(readPtrContext())) return;
  ptrRefreshing = true;
  renderPtrIndicator("refreshing");
  runStandaloneSoftRefresh("pull");
  window.setTimeout(() => finishRefreshFeedback(), 180);
}

/**
 * @param {TouchEvent} ev
 */
function onPtrTouchStart(ev) {
  if (!canStartPullToRefresh()) return;
  if (ev.touches.length !== 1) return;
  ptrTouchStartY = ev.touches[0].clientY;
  ptrPulling = true;
  ptrPullDistance = 0;
}

/**
 * @param {TouchEvent} ev
 */
function onPtrTouchMove(ev) {
  if (!ptrPulling || ptrRefreshing || ptrTouchStartY == null) return;
  if (ev.touches.length !== 1) return;
  if (
    !pullToRefreshAtScrollTop(
      window.scrollY || document.documentElement.scrollTop || 0
    )
  ) {
    resetPtrPull();
    return;
  }

  const delta = ev.touches[0].clientY - ptrTouchStartY;
  if (delta <= 0) {
    resetPtrPull();
    return;
  }

  ptrPullDistance = clampPullToRefreshDistance(delta * 0.45);
  const pullState = pullToRefreshPullState(ptrPullDistance, PTR_THRESHOLD_PX);
  renderPtrIndicator(pullState === "ready" ? "ready" : "pulling", ptrPullDistance);

  if (ptrPullDistance > 8) {
    ev.preventDefault();
  }
}

function onPtrTouchEnd() {
  if (!ptrPulling || ptrRefreshing) return;
  if (pullToRefreshShouldCommit(ptrPullDistance, PTR_THRESHOLD_PX)) {
    ptrPulling = false;
    ptrTouchStartY = null;
    executePullToRefresh();
    return;
  }
  resetPtrPull();
}

function bindPullToRefreshListeners() {
  if (ptrListenersBound) return;
  ptrListenersBound = true;
  window.addEventListener("touchstart", onPtrTouchStart, { passive: true });
  window.addEventListener("touchmove", onPtrTouchMove, { passive: false });
  window.addEventListener("touchend", onPtrTouchEnd);
  window.addEventListener("touchcancel", onPtrTouchEnd);
}

function ensureStaleShellBanner() {
  let el = document.getElementById(STALE_SHELL_BANNER_ID);
  if (el) return el;
  const page = document.querySelector(".page");
  if (!page) return null;
  el = document.createElement("div");
  el.id = STALE_SHELL_BANNER_ID;
  el.className = "device-pwa-stale-shell-banner";
  el.hidden = true;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  const installCard = document.getElementById("device-pwa-install-card");
  if (installCard?.parentNode) {
    installCard.parentNode.insertBefore(el, installCard.nextSibling);
  } else {
    page.insertBefore(el, page.firstChild);
  }
  return el;
}

function hideStaleShellBanner() {
  const el = document.getElementById(STALE_SHELL_BANNER_ID);
  if (!el) return;
  el.hidden = true;
  el.innerHTML = "";
  el.classList.remove("hc-emphasis-card", "hc-emphasis-card--info");
}

function showStaleShellBanner(healthBuild) {
  const el = ensureStaleShellBanner();
  if (!el) return;
  el.hidden = false;
  el.className =
    "hc-emphasis-card hc-emphasis-card--info device-pwa-stale-shell-banner";
  el.innerHTML = pwaStaleShellBannerHtml();

  el.querySelector("[data-pwa-stale-shell-refresh]")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.reload();
  });

  el.querySelector("[data-pwa-stale-shell-dismiss]")?.addEventListener("click", (e) => {
    e.preventDefault();
    writeStaleShellDismissedForSha(localStorage, healthBuild?.gitSha || "");
    hideStaleShellBanner();
  });
}

function removeStandaloneRefreshRow() {
  document.getElementById(PWA_REFRESH_ROW_ID)?.remove();
  document
    .getElementById("device-hub-glance-list")
    ?.querySelector(".device-pwa-refresh-row")
    ?.remove();
}

function mountStandaloneRefreshRow(walletPage) {
  if (
    !shouldShowStandaloneRefreshRow({
      standalone: readStandaloneModeFromWindow(window),
      pathname: window.location.pathname,
      savedCardCount: getWalletCount(),
    })
  ) {
    removeStandaloneRefreshRow();
    return;
  }

  if (walletPage) {
    const anchor = document.getElementById("device-hub-search-block");
    const page = document.getElementById("wallet-page");
    if (!anchor || !page) return;
    let row = document.getElementById(PWA_REFRESH_ROW_ID);
    if (!row) {
      row = document.createElement("div");
      row.id = PWA_REFRESH_ROW_ID;
      row.className = "device-pwa-refresh-row-wrap";
      row.innerHTML = `<ul class="device-hub-glance-list">${standaloneRefreshRowHtml({ walletPage: true })}</ul>`;
      page.insertBefore(row, anchor);
      row.querySelector("[data-pwa-refresh-row]")?.addEventListener("click", (e) => {
        e.preventDefault();
        executeManualStandaloneRefresh();
      });
    }
    return;
  }

  const list = document.getElementById("device-hub-glance-list");
  if (!list) return;
  let row = list.querySelector(".device-pwa-refresh-row");
  if (!row) {
    list.insertAdjacentHTML("afterbegin", standaloneRefreshRowHtml({ walletPage: false }));
    row = list.querySelector(".device-pwa-refresh-row");
    row?.querySelector("[data-pwa-refresh-row]")?.addEventListener("click", (e) => {
      e.preventDefault();
      executeManualStandaloneRefresh();
    });
  }
}

function hideStandalonePtrTip() {
  const el = document.getElementById(PWA_PTR_TIP_ID);
  if (!el) return;
  el.hidden = true;
  el.innerHTML = "";
  el.classList.remove("hc-emphasis-card", "hc-emphasis-card--info");
}

function ensurePtrTipCard() {
  let el = document.getElementById(PWA_PTR_TIP_ID);
  if (el) return el;
  const page = document.querySelector(".page");
  if (!page) return null;
  el = document.createElement("div");
  el.id = PWA_PTR_TIP_ID;
  el.hidden = true;
  el.setAttribute("role", "status");
  const staleBanner = document.getElementById(STALE_SHELL_BANNER_ID);
  const installCard = document.getElementById("device-pwa-install-card");
  if (staleBanner?.parentNode) {
    staleBanner.parentNode.insertBefore(el, staleBanner);
  } else if (installCard?.parentNode) {
    installCard.parentNode.insertBefore(el, installCard.nextSibling);
  } else {
    page.insertBefore(el, page.firstChild);
  }
  return el;
}

function showStandalonePtrTip() {
  const el = ensurePtrTipCard();
  if (!el) return;
  el.hidden = false;
  el.className = "hc-emphasis-card hc-emphasis-card--info device-pwa-ptr-tip";
  el.innerHTML = standalonePtrTipCardHtml();
  el.querySelector("[data-pwa-ptr-tip-dismiss]")?.addEventListener("click", (e) => {
    e.preventDefault();
    writePtrTipDismissed(localStorage);
    hideStandalonePtrTip();
  });
}

function syncStandalonePtrTip() {
  const show = shouldShowStandalonePtrTip({
    standalone: readStandaloneModeFromWindow(window),
    pathname: window.location.pathname,
    dismissed: readPtrTipDismissed(localStorage),
    savedCardCount: getWalletCount(),
  });
  if (!show) {
    hideStandalonePtrTip();
    return;
  }
  showStandalonePtrTip();
}

function syncStandaloneAffordances() {
  if (!readStandaloneModeFromWindow(window)) {
    removeStandaloneRefreshRow();
    hideStandalonePtrTip();
    return;
  }
  const walletPage = document.body.classList.contains("page-wallet");
  mountStandaloneRefreshRow(walletPage);
  syncStandalonePtrTip();
}

async function syncStaleShellNudge() {
  if (!readStandaloneModeFromWindow(window)) {
    hideStaleShellBanner();
    return;
  }
  if (staleShellSyncInFlight) return;
  staleShellSyncInFlight = true;
  try {
    const healthBuild = await fetchResolverHealthBuild(resolverApiOrigin());
    const show = shouldShowStaleShellNudge({
      standalone: true,
      pathname: window.location.pathname,
      healthBuild,
      clientMeta: SITE_BUILD_META,
      dismissedForSha: readStaleShellDismissedForSha(localStorage),
      deviceStatusLoadError: deviceStatusLoadError(),
    });
    if (!show) {
      hideStaleShellBanner();
      return;
    }
    showStaleShellBanner(healthBuild);
  } finally {
    staleShellSyncInFlight = false;
  }
}

bindResumeListeners();
bindPullToRefreshListeners();

if (readStandaloneModeFromWindow(window)) {
  syncStandaloneAffordances();
  void syncStaleShellNudge();
}

window.addEventListener("hc-device-hub-changed", syncStandaloneAffordances);
window.addEventListener("storage", (e) => {
  if (e.key === "hc_wallet") syncStandaloneAffordances();
});

if (typeof window !== "undefined") {
  /** Test hook — programmatic PTR without touch simulation. */
  window.__hcPtrTestTrigger = () => {
    executePullToRefresh();
  };
  /** Test hook — re-run stale shell health compare. */
  window.__hcStaleShellSyncForTests = () => syncStaleShellNudge();
  /** Test hook — re-render Phase 9 affordances. */
  window.__hcStandaloneAffordancesSyncForTests = () => syncStandaloneAffordances();
}

export {
  runStandaloneSoftRefresh as runStandaloneSoftRefreshForTests,
  scheduleStandaloneSoftRefresh as scheduleStandaloneSoftRefreshForTests,
  executePullToRefresh as executePullToRefreshForTests,
  executeManualStandaloneRefresh as executeManualStandaloneRefreshForTests,
  renderPtrIndicator as renderPtrIndicatorForTests,
  syncStaleShellNudge as syncStaleShellNudgeForTests,
  syncStandaloneAffordances as syncStandaloneAffordancesForTests,
};
