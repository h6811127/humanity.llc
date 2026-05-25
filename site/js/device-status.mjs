/**
 * Header status line, brand dot popover, collapsible On this device hub.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { buildStatusSegments, tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
import { isWalletSaved, loadWallet } from "./device-wallet.mjs";
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { refreshHubGlance } from "./device-hub-glance.mjs";
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

const summaryBtn = document.getElementById("device-status-summary");
const segmentsEl = document.getElementById("device-status-segments");
const dotBtn = document.getElementById("brand-status-dot-btn");
const dot = document.getElementById("brand-status-dot");
const popover = document.getElementById("brand-status-popover");
const popoverSheet = document.getElementById("brand-status-sheet");
const hub = document.getElementById("device-hub");
const systemBanner = document.getElementById("device-system-banner");

let networkStatus = "offline";
let popoverOpen = false;

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

export function setHubExpanded(open, { persist = true, haptic = false } = {}) {
  if (!hub) return;
  hub.classList.toggle("device-hub-collapsed", !open);
  if (summaryBtn) summaryBtn.setAttribute("aria-expanded", open ? "true" : "false");
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

function renderSegments() {
  const segments = buildStatusSegments(networkStatus);
  if (!segmentsEl) return segments;

  segmentsEl.innerHTML = "";
  segments.forEach((seg, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "device-status-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = " · ";
      segmentsEl.appendChild(sep);
    }
    const span = document.createElement("span");
    span.className = "device-status-seg";
    span.dataset.seg = seg.id;
    if (seg.zero) span.classList.add("is-zero");
    if (seg.highlight) span.classList.add("is-highlight");
    span.textContent = seg.label;
    segmentsEl.appendChild(span);
  });
  return segments;
}

function renderPopoverSheet(segments) {
  if (!popoverSheet) return;
  popoverSheet.innerHTML = "";
  for (const seg of segments) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "brand-status-sheet-row";
    row.dataset.seg = seg.id;
    row.innerHTML = `<span class="brand-status-sheet-key">${escapeSheetKey(seg.id)}</span><span class="brand-status-sheet-val">${seg.detail}</span>`;
    row.addEventListener("click", () => {
      handleSegmentAction(seg.id);
      setPopover(false);
    });
    popoverSheet.appendChild(row);
  }
  if (
    document.getElementById("landing-docs-footer") ||
    document.body.classList.contains("device-shell-wallet")
  ) {
    const help = document.createElement("a");
    help.href = "/features-available-now.html";
    help.className = "brand-status-sheet-row brand-status-sheet-link";
    help.innerHTML =
      '<span class="brand-status-sheet-key">Help</span><span class="brand-status-sheet-val">Protocol &amp; features ›</span>';
    popoverSheet.appendChild(help);
  }
}

function escapeSheetKey(id) {
  const map = {
    network: "Network",
    saved: "Saved",
    pinned: "Pinned",
    notices: "Notice",
    liveproof: "Live proof",
  };
  return map[id] || id;
}

function handleSegmentAction(segId) {
  if (segId === "network") return;
  if (segId === "notices" && tabNoticeCount() > 0) {
    setHubExpanded(true, { haptic: true });
    document.getElementById("device-hub-notice-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
    return;
  }
  setHubExpanded(true, { haptic: true });
  if (segId === "saved") {
    document.getElementById("device-hub-saved-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
  if (segId === "pinned") {
    document.getElementById("device-hub-pins-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
  if (segId === "liveproof") {
    document.getElementById("device-hub-live-control-group")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }
}

function setPopover(open) {
  popoverOpen = open;
  if (popover) popover.hidden = !open;
  if (dotBtn) dotBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function renderSystemBanner() {
  if (!systemBanner) return;
  if (networkStatus === "ok") {
    systemBanner.hidden = true;
    systemBanner.textContent = "";
    return;
  }
  systemBanner.hidden = false;
  systemBanner.textContent =
    networkStatus === "degraded"
      ? "Resolver degraded — create, update, and revoke may fail until health recovers."
      : "Network unreachable from this browser — public scans may still load; signing needs a connection.";
}

function refreshSummary() {
  const segments = renderSegments();
  renderPopoverSheet(segments);
  applyDot();
  renderSystemBanner();
  renderCrossTabKeysBanner();
  maybeAutoExpandNotice();
  refreshHubGlance();
}

function maybeAutoExpandNotice() {
  if (!hub || tabNoticeCount() === 0) return;
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

summaryBtn?.addEventListener("click", () => {
  setPopover(false);
  if (hub) {
    const open = hub.classList.contains("device-hub-collapsed");
    setHubExpanded(open, { haptic: true });
    return;
  }
  document.getElementById("device-hub")?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
});

const statusSearchBtn = document.getElementById("device-status-search");
statusSearchBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPopover(false);
  setHubExpanded(true, { haptic: true });
  window.dispatchEvent(new Event("hc-focus-hub-search"));
});

dotBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPopover(!popoverOpen);
  hapticTap();
});

document.addEventListener("click", (e) => {
  if (!popoverOpen || !popover) return;
  const target = e.target;
  if (target instanceof Node && (popover.contains(target) || dotBtn?.contains(target))) {
    return;
  }
  setPopover(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setPopover(false);
    if (hub && !hub.classList.contains("device-hub-collapsed")) {
      setHubExpanded(false, { haptic: false });
    }
  }
});

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
