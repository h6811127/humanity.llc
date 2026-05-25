/**
 * Floating status dot, notification badge, hub sheet host.
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

function deviceState() {
  if (hasUnsavedTabKeys()) return "unsaved";
  if (loadWallet().length > 0) return "keys";
  return "none";
}

export function notificationCount() {
  return tabNoticeCount() + getLiveControlPendingCount() + crossTabNoticeCount();
}

function isWalletPage() {
  return document.body.classList.contains("page-wallet");
}

function scrollWalletToTop() {
  walletPage?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  document.getElementById("device-hub-status-panel")?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  });
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

function renderStatusKey() {
  const el = document.getElementById("device-hub-status-key");
  if (!el) return;
  el.innerHTML = `
    <p class="device-hub-status-key-label">Status dot reference</p>
    <ul class="device-hub-status-key-list">
      <li>${statusKeyDot("#db1b43", true)} Pulsing red — default; tab keys not saved</li>
      <li>${statusKeyDot("#db1b43")} Solid red — saved keys on device</li>
      <li>${statusKeyDot("#d97706")} Amber — resolver limited</li>
      <li>${statusKeyDot("#9ca3af")} Gray — resolver offline</li>
    </ul>`;
}

function renderHubStatusPanel(segments) {
  if (!hubStatusPanel) return;
  const parts = segments.map((seg, i) => {
    const sep =
      i > 0
        ? '<span class="device-hub-status-sep" aria-hidden="true"> · </span>'
        : "";
    const cls = [
      "device-hub-status-seg",
      seg.zero ? "is-zero" : "",
      seg.highlight ? "is-highlight" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `${sep}<span class="${cls}" data-seg="${seg.id}">${escapeHtml(seg.label)}</span>`;
  });
  hubStatusPanel.innerHTML = `<p class="device-hub-status-line" role="status">${parts.join("")}</p>`;
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
    return;
  }
  if (networkStatus === "ok") {
    systemBanner.hidden = true;
    systemBanner.textContent = "";
    return;
  }
  systemBanner.hidden = false;
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

function openWalletFromChrome() {
  if (isGlancePopoverOpen()) {
    closeGlancePopover();
    scrollWalletToTop();
    hapticTap();
    return;
  }
  if (hubGlanceHasContent()) {
    setGlancePopoverOpen(true);
    hapticTap();
    return;
  }
  scrollWalletToTop();
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
