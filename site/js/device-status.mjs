/**
 * Floating status dot, notification badge, hub sheet host.
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */
import { closeInboxSheet, openInboxFromChrome } from "./device-inbox-sheet-loader.mjs?v=82";
import {
  shellSurfaceFromStandalone,
  statusKeyCrossTabLine,
} from "./device-shell-copy-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import { buildStatusSegments } from "./device-counts.mjs";
import { loadPins } from "./device-pins.mjs";
import {
  isHubStrangerEmptyState,
  isLandingStrangerChrome,
  LANDING_STRANGER_CHROME_CLASS,
} from "./device-hub-stranger-empty-core.mjs";
import { shouldSkipDotViewTransition } from "./device-status-dot-view-transition-core.mjs";
import { fetchResolverHealth } from "./device-network-health.mjs";
import { setResolverHealthStatusForSinceVisit } from "./device-wallet-since-visit-gate.mjs";

export const RESOLVER_HEALTH_CHANGED = "hc-resolver-health-changed";
import { ensureQuietTabRehydrateBootstrap } from "./device-quiet-tab-rehydrate-bootstrap.mjs";
import { scheduleStoragePersistRequest } from "./device-storage-persist.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import {
  isWalletSaved,
  loadWallet,
  loadWalletSummary,
} from "./device-wallet.mjs";
import {
  gatherInboxInput,
  getInboxItems,
  getInboxDotOverlay,
  notificationCount,
  preloadInboxModule,
} from "./device-inbox-loader.mjs?v=82";
import {
  inboxBadgeAriaLabel,
  inboxBadgeTitle,
  inboxBadgeChromaClass,
  inboxBadgeChromaClassNames,
  inboxBadgeChromaKind,
  inboxBadgeCountText,
  inboxCountFromItems,
} from "./device-inbox-core.mjs?v=82";
import { closeGlancePopover, isGlancePopoverOpen } from "./device-hub-glance-popover.mjs";
import {
  initHubIntroCoachmark,
  onHubOpenedFromIntro,
} from "./device-hub-intro-coachmark.mjs";
import { logDotDiagnostic } from "./device-dot-diagnostics.mjs";
import { logInboxDiagnostic } from "./device-inbox-diagnostics.mjs?v=82";
import {
  NETWORK_BASELINE_CHANGED,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import "./device-shell-motion.mjs";
import "./device-shell-chrome.mjs?v=82";
import "./device-theme.mjs";
import { initBrowserNotifications } from "./device-browser-notifications-loader.mjs?v=82";
import { reconcileHubSheetState } from "./device-hub-sheet-loader.mjs?v=82";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import {
  refreshDeviceChrome,
  setRefreshStatusSurfaces,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=82";
import { startTabKeysPresence } from "./device-tab-presence.mjs";
import {
  broadcastHealthSnapshotIfEligible,
  initResolverTabSync,
  RESOLVER_HEALTH_PEER_SYNC,
  shouldFollowerSkipAutoHealthFetch,
} from "./device-resolver-sync.mjs";
import {
  describeDotState,
  deviceStateFromContext,
  dotClassList,
  dotExplainerKicker,
  dotPageKindFromPathname,
  dotStateKey,
  dotTransitionKey,
  hasStewardVerification,
  hubStatusLineItemsFromSegments,
  scanWalletKeysNotInTab,
  SHELL_DOT_NEUTRAL_EMPTY_CLASS,
  shellDotUsesNeutralEmptyWallet,
  shouldCelebrateStewardTransition,
  statusAriaLabel,
} from "./device-dot-state-core.mjs?v=82";
import {
  markResolverHealthBootSettled,
} from "./device-resolver-health-boot-core.mjs";
import {
  DOT_STATE_CHANGED,
  getNetworkStatus,
  hubSheetOpen,
  isResolverHealthBootSettled,
  openHubFromChrome,
  setHubExpandedHook,
  setHubExpanded as setHubExpandedCore,
  setNetworkStatus,
} from "./device-status-core.mjs?v=82";
import {
  markDotBootstrapSettled,
  markDotBootReadyIfSettled,
  isDotBootstrapSettled,
} from "./device-status-dot-boot.mjs";

export { DOT_STATE_CHANGED };

export function setHubExpanded(open, opts) {
  setHubExpandedCore(open, opts);
}

setHubExpandedHook((open) => {
  if (open) onHubOpenedFromIntro();
  refreshDeviceChrome({ immediate: true });
});

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

const dotBtn = document.getElementById("brand-status-dot-btn");
const dot = document.getElementById("brand-status-dot");
const notifBtn = document.getElementById("shell-notif-badge");
const notifCountEl = document.getElementById("shell-notif-badge-count");
const hubStatusPanel = document.getElementById("device-hub-status-panel");
const shellStatusLine = document.getElementById("shell-status-line");
const hub = document.getElementById("device-hub");
const walletPage = document.getElementById("wallet-page");
const systemBanner = document.getElementById("device-system-banner");

let networkStatus = getNetworkStatus();
/** @type {{ network: string, device: string, overlay: string } | null} */
let lastDotSnapshot = null;
let stewardCelebrateTimer = null;

export { openInboxFromChrome };

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hapticTap() {
  try {
    navigator.vibrate?.(1);
  } catch {
    /* ignore */
  }
}

function hasUnsavedTabKeys() {
  const session = getTabSession();
  if (!session?.profile_id || !session?.owner_private_key_b58) return false;
  return !isWalletSaved(session.profile_id);
}

function hasStewardReadyKeys() {
  const session = getTabSession();
  if (session?.owner_private_key_b58 && hasStewardVerification(session)) return true;
  return loadWalletSummary().stewardReady;
}

function savedCardsWithSigningKeys() {
  return loadWallet().filter((entry) => Boolean(entry?.owner_private_key_b58));
}

function deviceState() {
  const summary = loadWalletSummary();
  return deviceStateFromContext({
    unsavedTabKeys: hasUnsavedTabKeys(),
    stewardReady:
      summary.stewardReady ||
      (() => {
        const session = getTabSession();
        return Boolean(session?.owner_private_key_b58 && hasStewardVerification(session));
      })(),
    savedWalletCount: summary.count,
  });
}

function shellDotSigningContext() {
  const session = getTabSession();
  const hasTabSigningKeys = Boolean(session?.owner_private_key_b58);
  const summary = loadWalletSummary();
  return {
    walletKeysNotInTab: scanWalletKeysNotInTab(
      summary.signingKeyCount,
      hasTabSigningKeys
    ),
    signingKeyCount: summary.signingKeyCount,
  };
}

function dotOverlayState() {
  return getInboxDotOverlay();
}

export { notificationCount };

function isWalletPage() {
  return document.body.classList.contains("page-wallet");
}


function maybeEmitDotTransition(network, device, overlay) {
  const key = dotTransitionKey(network, device, overlay);
  const prevKey = lastDotSnapshot
    ? dotTransitionKey(
        lastDotSnapshot.network,
        lastDotSnapshot.device,
        lastDotSnapshot.overlay
      )
    : null;
  if (key === prevKey) return;

  const detail = {
    type: "state_transition",
    from: prevKey,
    to: key,
    at: new Date().toISOString(),
    page: location.pathname,
  };
  window.dispatchEvent(new CustomEvent(DOT_STATE_CHANGED, { detail }));
  logDotDiagnostic(detail);
}

function applyStewardCelebrate(previousDevice, nextDevice) {
  if (!dot) return;
  dot.classList.remove("pass-dot-steward-celebrate");
  if (stewardCelebrateTimer != null) {
    clearTimeout(stewardCelebrateTimer);
    stewardCelebrateTimer = null;
  }
  if (
    !shouldCelebrateStewardTransition({
      network: networkStatus,
      previousDevice,
      nextDevice,
      reducedMotion: prefersReducedMotion(),
    })
  ) {
    return;
  }
  dot.classList.add("pass-dot-steward-celebrate");
  stewardCelebrateTimer = window.setTimeout(() => {
    dot?.classList.remove("pass-dot-steward-celebrate");
    stewardCelebrateTimer = null;
  }, 900);
}

function applyDot() {
  if (!dot) return;
  const device = deviceState();
  const overlay = dotOverlayState();
  const savedWalletCount = loadWalletSummary().count;
  const shellNeutralEmpty = shellDotUsesNeutralEmptyWallet({
    network: networkStatus,
    device,
    overlay,
    savedWalletCount,
  });
  const nextSnapshot = { network: networkStatus, device, overlay };
  const run = () => {
    const previousDevice = lastDotSnapshot?.device ?? null;
    dot.classList.remove(
      ...NETWORK_CLASSES,
      ...DEVICE_CLASSES,
      ...OVERLAY_CLASSES,
      SHELL_DOT_NEUTRAL_EMPTY_CLASS
    );
    for (const cls of dotClassList(networkStatus, device, overlay)) {
      dot.classList.add(cls);
    }
    if (shellNeutralEmpty) {
      dot.classList.add(SHELL_DOT_NEUTRAL_EMPTY_CLASS);
    }
    const dotState = dotStateKey(networkStatus, device);
    dot.dataset.dotState = dotState;
    dot.dataset.dotOverlay = overlay;
    dotBtn?.setAttribute("data-dot-state", dotState);
    dotBtn?.setAttribute("data-dot-overlay", overlay);
    const signing = shellDotSigningContext();
    dotBtn?.setAttribute(
      "aria-label",
      statusAriaLabel(networkStatus, device, overlay, {
        pageKind: dotPageKind(),
        walletKeysNotInTab: signing.walletKeysNotInTab,
        surface: shellSurfaceFromStandalone(readStandaloneModeFromWindow(window)),
      })
    );
    renderDotExplainability(networkStatus, device, overlay);
    applyStewardCelebrate(previousDevice, device);
    maybeEmitDotTransition(networkStatus, device, overlay);
    lastDotSnapshot = { network: networkStatus, device, overlay };
    markDotBootReadyIfSettled();
  };
  const skipTransition = shouldSkipDotViewTransition({
    prefersReducedMotion: prefersReducedMotion(),
    hubSheetOpen: hubSheetOpen(),
    viewTransitionsSupported: typeof document.startViewTransition === "function",
    shellBootState: document.body?.dataset?.boot,
    dotBootstrapSettled: isDotBootstrapSettled(),
    previousSnapshot: lastDotSnapshot,
    nextSnapshot,
  });

  if (skipTransition) {
    run();
  } else {
    document.startViewTransition(run);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function statusKeyDot(fill, ring = false) {
  const inner = ring
    ? `<circle cx="5" cy="5" r="5" fill="${fill}"/><circle cx="5" cy="5" r="5" fill="none" stroke="${fill}" stroke-width="2" opacity="0.45"/>`
    : `<circle cx="5" cy="5" r="5" fill="${fill}"/>`;
  return `<svg class="device-hub-status-key-dot" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">${inner}</svg>`;
}

function getStewardQueueUrl() {
  const details = document.getElementById("steward-review-details");
  if (!details || details.hidden) return null;
  const link = details.querySelector("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  return link.getAttribute("href") || null;
}

function dotPageKind() {
  return dotPageKindFromPathname(location.pathname, { isWalletPage: isWalletPage() });
}

function renderDotExplainer(container, descriptor, compact = false) {
  if (!container) return;
  const action = descriptor.action;
  const actionHtml = action
    ? action.href
      ? `<a class="device-dot-explainer-action" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
      : `<button type="button" class="device-dot-explainer-action" data-dot-action="${escapeHtml(action.kind)}">${escapeHtml(action.label)}</button>`
    : "";
  const kicker = dotExplainerKicker(descriptor, compact);
  container.innerHTML = `
    <p class="device-dot-explainer-kicker">${escapeHtml(kicker)}</p>
    <p class="device-dot-explainer-line"><strong>Now:</strong> ${escapeHtml(descriptor.now)}</p>
    <p class="device-dot-explainer-line"><strong>Why:</strong> ${escapeHtml(descriptor.why)}</p>
    <p class="device-dot-explainer-line"><strong>Next:</strong> ${escapeHtml(descriptor.next)}</p>
    ${actionHtml}`;
}

function renderDotExplainability(network, device, overlay) {
  const summary = loadWalletSummary();
  const signing = shellDotSigningContext();
  const descriptor = describeDotState(network, device, overlay, {
    stewardReady: hasStewardReadyKeys(),
    queueUrl: getStewardQueueUrl(),
    pageKind: dotPageKind(),
    singleSavedCardWithKeys: signing.signingKeyCount === 1,
    walletKeysNotInTab: signing.walletKeysNotInTab,
  });
  const keyRoot = document.getElementById("device-hub-status-key");
  if (keyRoot) {
    let panel = keyRoot.querySelector(".device-dot-explainer");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "device-dot-explainer";
      keyRoot.prepend(panel);
    }
    renderDotExplainer(panel, descriptor, false);
  }

  const popover =
    document.getElementById("device-hub-glance-popover") ||
    document.getElementById("wallet-hub-glance-popover");
  if (popover) {
    let panel = popover.querySelector(".device-dot-explainer");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "device-dot-explainer device-dot-explainer--popover";
      const list = popover.querySelector(".device-hub-glance-list");
      if (list?.parentNode) list.parentNode.insertBefore(panel, list);
    }
    renderDotExplainer(panel, descriptor, true);
  }
}

function renderStatusKey() {
  const el = document.getElementById("device-hub-status-key");
  if (!el) return;
  const surface = shellSurfaceFromStandalone(readStandaloneModeFromWindow(window));
  const crossTabLine = statusKeyCrossTabLine(surface);
  el.innerHTML = `
    <p class="device-hub-status-key-label">Status dot reference</p>
    <ul class="device-hub-status-key-list">
      <li>${statusKeyDot("#db1b43", true)} Pulsing red - default; tab keys not saved</li>
      <li>${statusKeyDot("#db1b43")} Solid red - saved keys on device</li>
      <li>${statusKeyDot("#22c55e")} Bright green - steward keys ready on this device</li>
      <li>${statusKeyDot("#d97706")} Amber - resolver limited</li>
      <li>${statusKeyDot("#9ca3af")} Gray - resolver offline</li>
      <li>${statusKeyDot("#f59e0b")} Amber notch - live proof waiting</li>
      <li>${statusKeyDot("#2563eb")} ${crossTabLine}</li>
    </ul>`;
}

function strangerChromeInput() {
  return {
    pathname: location.pathname,
    walletCount: loadWalletSummary().count,
    pinCount: loadPins().length,
    inboxActionCount: notificationCount(),
  };
}

function applyLandingStrangerChrome() {
  document.body.classList.toggle(
    LANDING_STRANGER_CHROME_CLASS,
    isLandingStrangerChrome(strangerChromeInput())
  );
}

function renderShellStatusLine() {
  if (shellStatusLine) {
    shellStatusLine.hidden = true;
    shellStatusLine.textContent = "";
  }
  applyLandingStrangerChrome();
}

function renderHubStatusPanel(segments) {
  if (!hubStatusPanel) return;
  const items = hubStatusLineItemsFromSegments(segments);
  const statusText = items.map((item) => item.label).join(" · ");
  const parts = items.map((item, index) => {
    const cls = [
      "device-hub-status-item",
      `device-hub-status-item--${item.id}`,
      `device-hub-status-item--${item.tone}`,
      `device-hub-status-item--${item.emphasis}`,
      item.zero ? "device-hub-status-item--zero" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const separator =
      index === 0
        ? ""
        : `<span class="device-hub-status-separator" aria-hidden="true"> · </span>`;
    return `${separator}<span class="${cls}" data-seg="${item.id}" title="${escapeHtml(item.detail)}">${escapeHtml(item.label)}</span>`;
  });
  hubStatusPanel.innerHTML = `<div class="device-hub-status-line" role="status" aria-label="${escapeHtml(statusText)}">${parts.join("")}</div>`;
}

function renderNotifBadge() {
  if (!notifBtn) return;
  const items = getInboxItems();
  const n = inboxCountFromItems(items);
  const ctx = gatherInboxInput();
  notifBtn.hidden = n === 0;
  notifBtn.setAttribute("aria-label", inboxBadgeAriaLabel(items, ctx));
  const title = inboxBadgeTitle(items, ctx);
  if (title) notifBtn.setAttribute("title", title);
  else notifBtn.removeAttribute("title");
  notifBtn.classList.remove(...inboxBadgeChromaClassNames());
  const chroma = inboxBadgeChromaKind(items);
  notifBtn.classList.add(inboxBadgeChromaClass(chroma));
  notifBtn.setAttribute("data-inbox-chroma", chroma);
  if (notifCountEl) {
    notifCountEl.textContent = inboxBadgeCountText(n);
  }
}

const INBOX_HUB_TARGETS = new Set([
  "device-hub-live-control-group",
  "device-hub-keys-custody",
  "device-hub-notice-group",
  "device-hub-crosstab-notice",
]);

function renderSystemBanner() {
  if (!systemBanner) return;
  if (!isResolverHealthBootSettled()) {
    systemBanner.hidden = true;
    systemBanner.textContent = "";
    systemBanner.classList.remove("hc-notice", "hc-notice--error");
    return;
  }
  if (hubStatusPanel) {
    systemBanner.hidden = true;
    systemBanner.textContent = "";
    systemBanner.classList.remove("hc-notice", "hc-notice--error");
    return;
  }
  if (networkStatus === "ok") {
    systemBanner.hidden = true;
    systemBanner.textContent = "";
    systemBanner.classList.remove("hc-notice", "hc-notice--error");
    return;
  }
  systemBanner.hidden = false;
  systemBanner.classList.add("hc-notice", "hc-notice--error");
  systemBanner.textContent =
    networkStatus === "degraded"
      ? "Resolver limited - create, update, and revoke may fail until service recovers."
      : "Resolver offline - scans may still load; signing needs a connection.";
}

function refreshSummary() {
  const segments = buildStatusSegments(networkStatus);
  renderShellStatusLine();
  renderHubStatusPanel(segments);
  renderStatusKey();
  applyDot();
  renderNotifBadge();
  renderSystemBanner();
}

/**
 * @param {{ manual?: boolean }} [opts] Manual dot retry bypasses follower health skip.
 */
async function refreshNetwork(opts = {}) {
  const manual = opts.manual === true;
  if (!manual && shouldFollowerSkipAutoHealthFetch()) {
    markResolverHealthBootSettled();
    markDotBootstrapSettled();
    refreshSummary();
    return;
  }
  networkStatus = await fetchResolverHealth(resolverApiOrigin());
  setNetworkStatus(networkStatus);
  markResolverHealthBootSettled();
  setResolverHealthStatusForSinceVisit(networkStatus);
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_CHANGED, { detail: { networkStatus } })
  );
  broadcastHealthSnapshotIfEligible(networkStatus, { manual });
  markDotBootstrapSettled();
  refreshSummary();
}

window.addEventListener(RESOLVER_HEALTH_PEER_SYNC, (e) => {
  const status = /** @type {{ networkStatus?: string } | undefined} */ (e.detail)
    ?.networkStatus;
  if (status !== "ok" && status !== "degraded" && status !== "offline") return;
  networkStatus = status;
  setNetworkStatus(networkStatus);
  markResolverHealthBootSettled();
  setResolverHealthStatusForSinceVisit(networkStatus);
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_CHANGED, { detail: { networkStatus } })
  );
  refreshSummary();
});

if (hub) {
  reconcileHubSheetState();
  renderStatusKey();
  initHubIntroCoachmark();
} else if (isWalletPage()) {
  renderStatusKey();
}

notifBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  logInboxDiagnostic({ type: "badge_click" });
  openInboxFromChrome("badge");
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (isGlancePopoverOpen()) {
    closeGlancePopover();
    return;
  }
  if (document.body.classList.contains("device-inbox-sheet-open")) {
    closeInboxSheet();
    return;
  }
  if (hub && !hub.classList.contains("device-hub-collapsed")) {
    setHubExpanded(false, { haptic: false });
  }
});

window.addEventListener("hc-focus-hub-search", () => {
  if (isWalletPage()) {
    document.getElementById("device-hub-search")?.focus({ preventScroll: true });
    return;
  }
  setHubExpanded(true, { haptic: false, persist: false });
  document.getElementById("device-hub-search")?.focus({ preventScroll: true });
});

async function bootDeviceStatusShell() {
  await ensureQuietTabRehydrateBootstrap();
  scheduleStoragePersistRequest({ reason: "shell_bootstrap" });
  startTabKeysPresence();
  initBrowserNotifications();
  initResolverTabSync();
  startCrossTabNotificationState();
  setRefreshStatusSurfaces(() => {
    refreshSummary();
  });
  startDeviceChromeRefresh();
  await refreshNetwork();
  refreshDeviceChrome({ immediate: true });
  preloadInboxModule(() => {
    refreshSummary();
    refreshDeviceChrome({ immediate: true });
  });
}

void bootDeviceStatusShell();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshNetwork();
});

window.addEventListener(NETWORK_BASELINE_CHANGED, () => refreshDeviceChrome({ immediate: true }));
window.addEventListener(NETWORK_REFRESHED, () => refreshDeviceChrome({ immediate: true }));

window.addEventListener("hc-hub-expand-request", (e) => {
  const targetId = e.detail?.targetId;
  if (targetId && INBOX_HUB_TARGETS.has(targetId)) {
    openInboxFromChrome("hub");
    return;
  }
  if (isWalletPage()) {
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
      });
    } else {
      openInboxFromChrome("hub");
    }
    return;
  }
  if (!hub) return;
  setHubExpanded(true, { haptic: true, persist: false });
  if (targetId) {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
});

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;
  const linkEl = e.target.closest(".device-dot-explainer-action[href]");
  if (linkEl instanceof HTMLAnchorElement) {
    logDotDiagnostic({
      type: "quick_action",
      action: "link",
      href: linkEl.getAttribute("href") || "",
    });
    return;
  }
  const actionEl = e.target.closest("[data-dot-action]");
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-dot-action");
  if (!action) return;
  logDotDiagnostic({ type: "quick_action", action });
  if (action === "retry") {
    void refreshNetwork({ manual: true });
    return;
  }
  if (action === "open_controls") {
    openHubFromChrome();
    return;
  }
  if (action === "open_card_controls") {
    const entries = savedCardsWithSigningKeys();
    if (entries.length === 1) {
      openCardNowPage(entries[0]);
      return;
    }
    openHubFromChrome();
    return;
  }
  if (action === "open_notifications") {
    openInboxFromChrome("dot_explainer");
  }
});
