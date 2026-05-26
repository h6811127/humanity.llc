/**
 * Floating status dot, notification badge, hub sheet host.
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { buildStatusSegments, tabNoticeCount } from "./device-counts.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getTabSession } from "./device-keys.mjs";
import { isWalletSaved, loadWallet } from "./device-wallet.mjs";
import { crossTabNoticeCount } from "./device-tab-presence.mjs";
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { hubGlanceHasContent, refreshHubGlance } from "./device-hub-glance.mjs";
import {
  closeGlancePopover,
  isGlancePopoverOpen,
  setGlancePopoverOpen,
} from "./device-hub-glance-popover.mjs";
import "./device-shell-motion.mjs";
import "./device-shell-chrome.mjs";
import "./device-theme.mjs";
import "./device-browser-notifications.mjs";
import { isHubSheet, setHubSheetOpen } from "./device-hub-sheet.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

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

const dotBtn = document.getElementById("brand-status-dot-btn");
const dot = document.getElementById("brand-status-dot");
const notifBtn = document.getElementById("shell-notif-badge");
const notifCountEl = document.getElementById("shell-notif-badge-count");
const hubStatusPanel = document.getElementById("device-hub-status-panel");
const hub = document.getElementById("device-hub");
const walletPage = document.getElementById("wallet-page");
const systemBanner = document.getElementById("device-system-banner");

let networkStatus = "offline";

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

function hasStewardVerification(record) {
  const state = String(record?.verification?.state || "").toLowerCase();
  const label = String(record?.verification?.label || "").toLowerCase();
  return state === "steward" || label === "steward";
}

function hasStewardReadyKeys() {
  const session = getTabSession();
  if (session?.owner_private_key_b58 && hasStewardVerification(session)) return true;
  return loadWallet().some(
    (entry) => Boolean(entry?.owner_private_key_b58) && hasStewardVerification(entry)
  );
}

function deviceState() {
  if (hasUnsavedTabKeys()) return "unsaved";
  if (hasStewardReadyKeys()) return "steward";
  if (loadWallet().length > 0) return "keys";
  return "none";
}

function statusAriaLabel(network, device) {
  const networkText =
    network === "ok"
      ? "resolver online"
      : network === "degraded"
        ? "resolver limited"
        : "resolver offline";
  const deviceText =
    device === "unsaved"
      ? "tab keys not saved"
      : device === "steward"
        ? "steward keys ready"
        : device === "keys"
          ? "saved keys on device"
          : "no saved keys on device";
  return `Status: ${networkText}, ${deviceText}.`;
}

export function notificationCount() {
  return tabNoticeCount() + getLiveControlPendingCount() + crossTabNoticeCount();
}

function isWalletPage() {
  return document.body.classList.contains("page-wallet");
}


export function setHubExpanded(open, { persist = true, haptic = false } = {}) {
  if (!hub) return;
  if (open) closeGlancePopover();
  if (isHubSheet()) {
    setHubSheetOpen(open);
  } else {
    hub.classList.toggle("device-hub-collapsed", !open);
  }
  if (dotBtn) dotBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (persist) {
    sessionStorage.setItem(HUB_OPEN_KEY, open ? "1" : "0");
  }
  if (haptic) hapticTap();
  refreshHubGlance();
}

function hubSheetOpen() {
  return (
    document.body.classList.contains("device-hub-sheet-open") ||
    (hub && !hub.classList.contains("device-hub-collapsed"))
  );
}

function applyDot() {
  if (!dot) return;
  const run = () => {
    const device = deviceState();
    dot.classList.remove(...NETWORK_CLASSES, ...DEVICE_CLASSES);
    dot.classList.add(`pass-dot-status-network-${networkStatus}`);
    dot.classList.add(`pass-dot-status-device-${device}`);
    const dotState = `${networkStatus}:${device}`;
    dot.dataset.dotState = dotState;
    dotBtn?.setAttribute("data-dot-state", dotState);
    dotBtn?.setAttribute("aria-label", statusAriaLabel(networkStatus, device));
    renderDotExplainability(networkStatus, device);
  };
  if (
    !prefersReducedMotion() &&
    !hubSheetOpen() &&
    typeof document.startViewTransition === "function"
  ) {
    document.startViewTransition(run);
  } else {
    run();
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

function describeDotState(network, device) {
  const stewardReady = hasStewardReadyKeys();
  const queueUrl = getStewardQueueUrl();
  if (network === "offline") {
    return {
      id: "offline",
      now: "Resolver offline.",
      why: stewardReady
        ? "Steward keys are ready locally, but network is unreachable."
        : "Health check failed and signing actions need a connection.",
      next: "Retry resolver check.",
      action: { kind: "retry", label: "Retry status check" },
    };
  }
  if (network === "degraded") {
    return {
      id: "degraded",
      now: "Resolver limited.",
      why: stewardReady
        ? "Steward keys are ready locally; network responses are currently limited."
        : "Resolver reported degraded health.",
      next: "Retry status check or wait for recovery.",
      action: { kind: "retry", label: "Retry status check" },
    };
  }
  if (device === "unsaved") {
    return {
      id: "unsaved",
      now: "Tab keys not saved.",
      why: "This tab has signing keys that are not yet saved to this device.",
      next: "Open controls and save keys.",
      action: { kind: "open_controls", label: "Open controls" },
    };
  }
  if (device === "steward") {
    return {
      id: "steward",
      now: "Steward ready, resolver online.",
      why: "Steward-capable signing keys are available in this browser context.",
      next: queueUrl ? "Open steward review queue." : "Open controls for steward actions.",
      action: queueUrl
        ? { kind: "open_steward_queue", label: "Open steward queue", href: queueUrl }
        : { kind: "open_controls", label: "Open controls" },
    };
  }
  if (device === "keys") {
    return {
      id: "keys",
      now: "Saved keys ready.",
      why: "Signing keys are saved on this device and resolver is online.",
      next: "Open controls to manage a saved card.",
      action: { kind: "open_controls", label: "Open controls" },
    };
  }
  return {
    id: "none",
    now: "No saved keys on this device.",
    why: "Resolver is online, but this browser has no saved signing keys.",
    next: "Create a card or save keys from this tab.",
    action: { kind: "create_card", label: "Create a card", href: "/create/" },
  };
}

function renderDotExplainer(container, descriptor, compact = false) {
  if (!container) return;
  const action = descriptor.action;
  const actionHtml = action
    ? action.href
      ? `<a class="device-dot-explainer-action" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
      : `<button type="button" class="device-dot-explainer-action" data-dot-action="${escapeHtml(action.kind)}">${escapeHtml(action.label)}</button>`
    : "";
  container.innerHTML = `
    <p class="device-dot-explainer-kicker">${compact ? "Status now" : "Status explainer"}</p>
    <p class="device-dot-explainer-line"><strong>Now:</strong> ${escapeHtml(descriptor.now)}</p>
    <p class="device-dot-explainer-line"><strong>Why:</strong> ${escapeHtml(descriptor.why)}</p>
    <p class="device-dot-explainer-line"><strong>Next:</strong> ${escapeHtml(descriptor.next)}</p>
    ${actionHtml}`;
}

function renderDotExplainability(network, device) {
  const descriptor = describeDotState(network, device);
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
      <li>${statusKeyDot("#db1b43", true)} Pulsing red — default; tab keys not saved</li>
      <li>${statusKeyDot("#db1b43")} Solid red — saved keys on device</li>
      <li>${statusKeyDot("#22c55e")} Bright green — steward keys ready on this device</li>
      <li>${statusKeyDot("#d97706")} Amber — resolver limited</li>
      <li>${statusKeyDot("#9ca3af")} Gray — resolver offline</li>
    </ul>`;
}

function renderHubStatusPanel(segments) {
  if (!hubStatusPanel) return;
  const chips = segments.map((seg) => {
    const label = seg.chipLabel ?? seg.label;
    const tone = seg.chipTone ?? (seg.highlight ? "highlight" : "neutral");
    const cls = [
      "device-hub-chip",
      `device-hub-chip--${seg.id}`,
      `device-hub-chip--${tone}`,
      seg.zero ? "device-hub-chip--zero" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<span class="${cls}" data-seg="${seg.id}" title="${escapeHtml(seg.detail)}">${escapeHtml(label)}</span>`;
  });
  hubStatusPanel.innerHTML = `<div class="device-hub-status-chips" role="status" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${chips.join("")}</div>`;
}

function renderNotifBadge() {
  if (!notifBtn) return;
  const n = notificationCount();
  notifBtn.hidden = n === 0;
  if (notifCountEl) {
    notifCountEl.textContent = n > 9 ? "9+" : String(n);
  }
}

function scrollToFirstNotification() {
  const alerts =
    document.getElementById("wallet-alerts-top") ||
    document.getElementById("device-hub-alerts-top");
  alerts?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  });
}

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
  renderHubStatusPanel(segments);
  renderStatusKey();
  applyDot();
  renderNotifBadge();
  renderSystemBanner();
  renderCrossTabKeysBanner();
  refreshHubGlance();
}

async function fetchNetworkStatus() {
  const url = new URL("/.well-known/hc/v1/health", resolverApiOrigin()).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status === "degraded") return "degraded";
    return "ok";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}

async function refreshNetwork() {
  networkStatus = await fetchNetworkStatus();
  refreshSummary();
}

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
  if (isWalletPage()) {
    openWalletFromChrome();
    return;
  }
  if (!hub) {
    location.href = "/";
    return;
  }
  if (hubSheetOpen()) {
    setHubExpanded(false, { haptic: true, persist: false });
    return;
  }
  if (isGlancePopoverOpen()) {
    closeGlancePopover();
    setHubExpanded(true, { haptic: true, persist: false });
    return;
  }
  if (hubGlanceHasContent()) {
    setGlancePopoverOpen(true);
    hapticTap();
    return;
  }
  setHubExpanded(true, { haptic: true, persist: false });
}

if (hub) {
  sessionStorage.setItem(HUB_OPEN_KEY, "0");
  setHubExpanded(false, { persist: false });
  renderStatusKey();
} else if (isWalletPage()) {
  renderStatusKey();
}

dotBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  openHubFromChrome();
});

notifBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (isWalletPage()) {
    hapticTap();
    scrollToFirstNotification();
    return;
  }
  if (!hub) {
    location.href = "/";
    return;
  }
  closeGlancePopover();
  setHubExpanded(true, { haptic: true, persist: false });
  window.setTimeout(scrollToFirstNotification, 120);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (isGlancePopoverOpen()) {
    closeGlancePopover();
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
refreshNetwork();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshNetwork();
});

window.addEventListener("storage", (e) => {
  if (e.key === "hc_wallet" || e.key === "hc_device_pins" || e.key === "hc_created") {
    refreshSummary();
  }
});

window.addEventListener("hc-device-hub-changed", refreshSummary);
window.addEventListener("hc-live-control-inbox-changed", refreshSummary);
window.addEventListener("hc-tab-presence-changed", refreshSummary);

window.addEventListener("hc-hub-expand-request", (e) => {
  const targetId = e.detail?.targetId;
  if (isWalletPage()) {
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
      });
    } else {
      scrollToFirstNotification();
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
  const actionEl = e.target instanceof Element ? e.target.closest("[data-dot-action]") : null;
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-dot-action");
  if (action === "retry") {
    refreshNetwork();
    return;
  }
  if (action === "open_controls") {
    openHubFromChrome();
  }
});
