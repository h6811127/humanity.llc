/**
 * Standalone PWA soft refresh on resume + pull-to-refresh + stale shell nudge.
 * @see docs/PWA_INSTALL.md § Standalone refresh & resume — Phases 6–8
 */

import { SITE_BUILD_META } from "./build-meta.mjs";
import { refreshDeviceChrome } from "./device-chrome-refresh.mjs";
import { fetchResolverHealthBuild } from "./device-network-health.mjs";
import { refreshDeviceHub } from "./device-hub-ui.mjs";
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
  readStandaloneModeFromWindow,
  readStaleShellDismissedForSha,
  runStandaloneSoftRefreshPipeline,
  shouldShowStaleShellNudge,
  shouldTriggerStandaloneResumeRefresh,
  STANDALONE_SOFT_REFRESH_DEBOUNCE_MS,
  writeStaleShellDismissedForSha,
} from "./pwa-standalone-refresh-core.mjs";
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

function executePullToRefresh() {
  if (ptrRefreshing || !pullToRefreshAllowed(readPtrContext())) return;
  ptrRefreshing = true;
  renderPtrIndicator("refreshing");
  runStandaloneSoftRefresh("pull");
  window.setTimeout(() => {
    ptrRefreshing = false;
    renderPtrIndicator("updated");
    if (ptrUpdatedTimer != null) clearTimeout(ptrUpdatedTimer);
    ptrUpdatedTimer = window.setTimeout(() => {
      ptrUpdatedTimer = null;
      resetPtrPull();
      void syncStaleShellNudge();
    }, PTR_UPDATED_HIDE_MS);
  }, 180);
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
  void syncStaleShellNudge();
}

if (typeof window !== "undefined") {
  /** Test hook — programmatic PTR without touch simulation. */
  window.__hcPtrTestTrigger = () => {
    executePullToRefresh();
  };
  /** Test hook — re-run stale shell health compare. */
  window.__hcStaleShellSyncForTests = () => syncStaleShellNudge();
}

export {
  runStandaloneSoftRefresh as runStandaloneSoftRefreshForTests,
  scheduleStandaloneSoftRefresh as scheduleStandaloneSoftRefreshForTests,
  executePullToRefresh as executePullToRefreshForTests,
  renderPtrIndicator as renderPtrIndicatorForTests,
  syncStaleShellNudge as syncStaleShellNudgeForTests,
};
