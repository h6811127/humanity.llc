/**
 * Floating status dot, notification badge, hub sheet host.
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */
import { closeInboxSheet, openInboxFromChrome } from "./device-inbox-sheet-loader.mjs?v=58";
import { buildStatusSegments } from "./device-counts.mjs";
import { shouldSkipCrossTabOverlayViewTransition } from "./device-presence-inbox-stability-core.mjs";
import { fetchResolverHealth } from "./device-network-health.mjs";
import { setResolverHealthStatusForSinceVisit } from "./device-wallet-since-visit-gate.mjs";

export const RESOLVER_HEALTH_CHANGED = "hc-resolver-health-changed";
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
  inboxBadgeAriaLabel,
  inboxBadgeTitle,
  inboxBadgeChromaClass,
  inboxBadgeChromaClassNames,
  inboxBadgeChromaKind,
  inboxBadgeCountText,
  inboxCountFromItems,
  notificationCount,
} from "./device-inbox.mjs?v=58";
import { closeGlancePopover, isGlancePopoverOpen } from "./device-hub-glance-popover.mjs";
import {
  initHubIntroCoachmark,
  onHubOpenedFromIntro,
} from "./device-hub-intro-coachmark.mjs";
import { logDotDiagnostic } from "./device-dot-diagnostics.mjs";
import { logInboxDiagnostic } from "./device-inbox-diagnostics.mjs?v=58";
import {
  NETWORK_BASELINE_CHANGED,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import "./device-shell-motion.mjs";
import "./device-shell-chrome.mjs?v=58";
import "./device-theme.mjs";
import { initBrowserNotifications } from "./device-browser-notifications-loader.mjs?v=58";
import {
  isHubSheet,
  reconcileHubSheetState,
  setHubSheetOpen,
} from "./device-hub-sheet.mjs?v=58";
import { startCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import {
  refreshDeviceChrome,
  setRefreshStatusSurfaces,
  startDeviceChromeRefresh,
} from "./device-chrome-refresh.mjs?v=58";
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
  dotStateKey,
  dotTransitionKey,
  hasStewardVerification,
  hubStatusLineItemsFromSegments,
  SHELL_DOT_NEUTRAL_EMPTY_CLASS,
  shellChromeStatusLineFromSegments,
  shellDotUsesNeutralEmptyWallet,
  shellStatusLinePrimaryInChrome,
  shouldCelebrateStewardTransition,
  statusAriaLabel,
} from "./device-dot-state-core.mjs?v=58";

export const DOT_STATE_CHANGED = "hc-dot-state-changed";

const HUB_OPEN_KEY = "hc_hub_open";

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

let networkStatus = "offline";
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

function dotOverlayState() {
  return getInboxDotOverlay();
}

export { notificationCount };

function isWalletPage() {
  return document.body.classList.contains("page-wallet");
}


export function setHubExpanded(open, { persist = true, haptic = false } = {}) {
  if (!hub) return;
  if (open) {
    closeGlancePopover();
    closeInboxSheet();
    onHubOpenedFromIntro();
  }
  if (isHubSheet()) {
    setHubSheetOpen(open);
  } else {
    hub.classList.toggle("device-hub-collapsed", !open);
    window.dispatchEvent(new Event("hc-live-control-poll-scope-changed"));
  }
  if (dotBtn) dotBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (persist) {
    sessionStorage.setItem(HUB_OPEN_KEY, open ? "1" : "0");
  }
  if (haptic) {
    hapticTap();
    logDotDiagnostic({
      type: "hub_toggle",
      open,
      bodyOpen: document.body.classList.contains("device-hub-sheet-open"),
      hubCollapsed: hub?.classList.contains("device-hub-collapsed") ?? null,
    });
  }
  refreshDeviceChrome({ immediate: true });
}

function hubSheetOpen() {
  if (hub?.classList.contains("device-hub-collapsed")) {
    return false;
  }
  return (
    document.body.classList.contains("device-hub-sheet-open") ||
    (hub && !hub.classList.contains("device-hub-collapsed"))
  );
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
    dotBtn?.setAttribute(
      "aria-label",
      statusAriaLabel(networkStatus, device, overlay, { pageKind: dotPageKind() })
    );
    renderDotExplainability(networkStatus, device, overlay);
    applyStewardCelebrate(previousDevice, device);
    maybeEmitDotTransition(networkStatus, device, overlay);
    lastDotSnapshot = { network: networkStatus, device, overlay };
  };
  const skipTransition =
    prefersReducedMotion() ||
    hubSheetOpen() ||
    typeof document.startViewTransition !== "function" ||
    shouldSkipCrossTabOverlayViewTransition(lastDotSnapshot, nextSnapshot);

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
  const link = document.querySelector("#steward-review-details a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  return link.getAttribute("href") || null;
}

function dotPageKind() {
  if (isWalletPage()) return "wallet";
  const path = location.pathname;
  if (path.startsWith("/created")) return "created";
  if (path.startsWith("/create")) return "create";
  return "landing";
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
  const descriptor = describeDotState(network, device, overlay, {
    stewardReady: hasStewardReadyKeys(),
    queueUrl: getStewardQueueUrl(),
    pageKind: dotPageKind(),
    singleSavedCardWithKeys: summary.signingKeyCount === 1,
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
  el.innerHTML = `
    <p class="device-hub-status-key-label">Status dot reference</p>
    <ul class="device-hub-status-key-list">
      <li>${statusKeyDot("#db1b43", true)} Pulsing red - default; tab keys not saved</li>
      <li>${statusKeyDot("#db1b43")} Solid red - saved keys on device</li>
      <li>${statusKeyDot("#22c55e")} Bright green - steward keys ready on this device</li>
      <li>${statusKeyDot("#d97706")} Amber - resolver limited</li>
      <li>${statusKeyDot("#9ca3af")} Gray - resolver offline</li>
      <li>${statusKeyDot("#f59e0b")} Amber notch - live proof waiting</li>
      <li>${statusKeyDot("#2563eb")} Blue notch - keys in another tab</li>
    </ul>`;
}

function renderShellStatusLine(segments) {
  if (!shellStatusLine) return;
  const savedWalletCount = loadWalletSummary().count;
  const device = deviceState();
  const overlay = dotOverlayState();
  const show = shellStatusLinePrimaryInChrome({
    device,
    overlay,
    savedWalletCount,
  });
  if (!show) {
    shellStatusLine.hidden = true;
    shellStatusLine.textContent = "";
    return;
  }
  shellStatusLine.hidden = false;
  shellStatusLine.textContent = shellChromeStatusLineFromSegments(segments);
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
  renderShellStatusLine(segments);
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
    refreshSummary();
    return;
  }
  networkStatus = await fetchResolverHealth(resolverApiOrigin());
  setResolverHealthStatusForSinceVisit(networkStatus);
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_CHANGED, { detail: { networkStatus } })
  );
  broadcastHealthSnapshotIfEligible(networkStatus, { manual });
  refreshSummary();
}

window.addEventListener(RESOLVER_HEALTH_PEER_SYNC, (e) => {
  const status = /** @type {{ networkStatus?: string } | undefined} */ (e.detail)
    ?.networkStatus;
  if (status !== "ok" && status !== "degraded" && status !== "offline") return;
  networkStatus = status;
  setResolverHealthStatusForSinceVisit(networkStatus);
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_CHANGED, { detail: { networkStatus } })
  );
  refreshSummary();
});

function scrollWalletToSaved() {
  const target =
    document.getElementById("device-hub-saved-group") ||
    document.getElementById("wallet-page");
  target?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function openWalletFromChrome() {
  closeGlancePopover();
  scrollWalletToSaved();
  hapticTap();
}

function openHubFromChrome() {
  closeGlancePopover();
  if (isWalletPage()) {
    openWalletFromChrome();
    return;
  }
  if (!hub) {
    location.href = "/";
    return;
  }
  hapticTap();
  if (hubSheetOpen()) {
    setHubExpanded(false, { haptic: true, persist: false });
    return;
  }
  setHubExpanded(true, { haptic: true, persist: false });
}

if (hub) {
  sessionStorage.setItem(HUB_OPEN_KEY, "0");
  setHubExpanded(false, { persist: false });
  reconcileHubSheetState();
  renderStatusKey();
  initHubIntroCoachmark();
} else if (isWalletPage()) {
  renderStatusKey();
}

dotBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  logDotDiagnostic({ type: "dot_click" });
  openHubFromChrome();
});

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

window.addEventListener("hc-hub-sheet-close", () => {
  if (!hub) return;
  setHubExpanded(false, { haptic: false, persist: false });
});

window.addEventListener("hc-focus-hub-search", () => {
  if (isWalletPage()) {
    document.getElementById("device-hub-search")?.focus({ preventScroll: true });
    return;
  }
  setHubExpanded(true, { haptic: false, persist: false });
  document.getElementById("device-hub-search")?.focus({ preventScroll: true });
});

startTabKeysPresence();
initBrowserNotifications();
initResolverTabSync();
startCrossTabNotificationState();
setRefreshStatusSurfaces(() => {
  refreshSummary();
});
startDeviceChromeRefresh();
refreshDeviceChrome({ immediate: true });
void refreshNetwork();

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
