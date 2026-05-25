/**
 * Floating status dot, notification badge, hub sheet host.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { buildStatusSegments, tabNoticeCount } from "./device-counts.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getTabSession } from "./device-keys.mjs";
import { isWalletSaved, loadWallet } from "./device-wallet.mjs";
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { refreshHubGlance } from "./device-hub-glance.mjs";
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import "./device-shell-motion.mjs";
import "./device-shell-chrome.mjs";
import { isHubSheet, setHubSheetOpen } from "./device-hub-sheet.mjs";
import { startTabKeysPresence } from "./device-tab-presence.mjs";

const HUB_OPEN_KEY = "hc_hub_open";
const NOTICE_EXPAND_KEY = "hc_notice_hub_expand";

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

function crossTabNoticeCount() {
  if (tabNoticeCount() > 0) return 0;
  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return 0;
  if (!thisHasKeys) return 1;
  return others.some((o) => o.profile_id !== session.profile_id) ? 1 : 0;
}

export function notificationCount() {
  return tabNoticeCount() + getLiveControlPendingCount() + crossTabNoticeCount();
}

export function setHubExpanded(open, { persist = true, haptic = false } = {}) {
  if (!hub) return;
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

function applyDot() {
  if (!dot) return;
  const device = deviceState();
  dot.classList.remove(...NETWORK_CLASSES, ...DEVICE_CLASSES);
  dot.classList.add(`pass-dot-status-network-${networkStatus}`);
  dot.classList.add(`pass-dot-status-device-${device}`);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function segmentSheetKey(id) {
  const map = {
    network: "Resolver",
    saved: "On device",
    pinned: "Pinned",
    notices: "Tab keys",
    liveproof: "Live proof",
  };
  return map[id] || id;
}

function renderHubStatusPanel(segments) {
  if (!hubStatusPanel) return;
  const rows = segments
    .map(
      (seg) => `
    <li class="list-row device-hub-status-row${seg.highlight ? " device-hub-status-row--alert" : ""}">
      <span class="list-content">
        <span class="list-title">${escapeHtml(segmentSheetKey(seg.id))}</span>
        <span class="list-sub">${escapeHtml(seg.detail)}</span>
      </span>
    </li>`
    )
    .join("");

  hubStatusPanel.innerHTML = `
    <p class="device-hub-group-label">System</p>
    <ul class="list list-compact device-hub-status-list">${rows}</ul>`;
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
  if (tabNoticeCount() > 0) {
    document.getElementById("device-hub-notice-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
    return;
  }
  if (getLiveControlPendingCount() > 0) {
    document.getElementById("device-hub-live-control-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
    return;
  }
  if (crossTabNoticeCount() > 0) {
    document.getElementById("device-hub-notice-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
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
  applyDot();
  renderNotifBadge();
  renderSystemBanner();
  renderCrossTabKeysBanner();
  refreshHubGlance();
}

function maybeAutoExpandNotice() {
  if (!hub || notificationCount() === 0) return;
  if (sessionStorage.getItem(NOTICE_EXPAND_KEY) === "1") return;
  sessionStorage.setItem(NOTICE_EXPAND_KEY, "1");
  setHubExpanded(true, { persist: false });
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

function maybeAutoExpandCreated() {
  if (!hub || !location.pathname.startsWith("/created")) return;
  const session = getTabSession();
  if (!session?.owner_private_key_b58) return;
  if (sessionStorage.getItem(HUB_OPEN_KEY) != null) return;
  setHubExpanded(true, { persist: true });
}

function maybeExpandWalletHub() {
  if (!hub || !location.pathname.startsWith("/wallet")) return;
  setHubExpanded(true, { persist: true });
}

function toggleHubFromChrome() {
  if (!hub) return;
  const open = hub.classList.contains("device-hub-collapsed");
  setHubExpanded(open, { haptic: true, persist: true });
}

if (hub) {
  if (location.pathname.startsWith("/wallet")) {
    maybeExpandWalletHub();
  } else {
    const persisted = sessionStorage.getItem(HUB_OPEN_KEY) === "1";
    setHubExpanded(persisted, { persist: false });
    if (!persisted) {
      maybeAutoExpandNotice();
      maybeAutoExpandCreated();
    }
  }
}

window.addEventListener("hc-landing-focus-on", () => {
  if (hub) setHubExpanded(true, { persist: true, haptic: false });
});

dotBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleHubFromChrome();
});

notifBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setHubExpanded(true, { haptic: true, persist: true });
  window.setTimeout(scrollToFirstNotification, 120);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && hub && !hub.classList.contains("device-hub-collapsed")) {
    setHubExpanded(false, { haptic: false });
  }
});

window.addEventListener("hc-hub-sheet-close", () => {
  setHubExpanded(false, { haptic: false, persist: true });
});

window.addEventListener("hc-focus-hub-search", () => {
  setHubExpanded(true, { haptic: false, persist: true });
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
  if (!hub) return;
  setHubExpanded(true, { haptic: true, persist: true });
  const targetId = e.detail?.targetId;
  if (targetId) {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
});
