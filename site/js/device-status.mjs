/**
 * Header status line, brand dot, and collapsible On this device hub.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { loadWallet, isWalletSaved } from "./device-wallet.mjs";
import { buildStatusLine } from "./device-counts.mjs";

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
const summaryText = document.getElementById("device-status-text");
const dotBtn = document.getElementById("brand-status-dot-btn");
const dot = document.getElementById("brand-status-dot");
const popover = document.getElementById("brand-status-popover");
const popoverText = document.getElementById("brand-status-popover-text");
const hub = document.getElementById("device-hub");

let networkStatus = "offline";
let popoverOpen = false;

function hasUnsavedTabKeys() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.profile_id || !session?.owner_private_key_b58) return false;
    return !isWalletSaved(session.profile_id);
  } catch {
    return false;
  }
}

function deviceState() {
  if (hasUnsavedTabKeys()) return "unsaved";
  if (loadWallet().length > 0) return "keys";
  return "none";
}

function statusDetailText() {
  const { parts } = buildStatusLine(networkStatus);
  const device =
    deviceState() === "unsaved"
      ? "Keys in this tab are not saved on this device yet."
      : deviceState() === "keys"
        ? "Signing keys are saved in this browser."
        : "No signing keys saved on this device.";
  return `${parts.join(" · ")}. ${device} Tap the line below to open On this device.`;
}

function applyDot() {
  if (!dot) return;
  const device = deviceState();
  dot.classList.remove(...NETWORK_CLASSES, ...DEVICE_CLASSES);
  dot.classList.add(`pass-dot-status-network-${networkStatus}`);
  dot.classList.add(`pass-dot-status-device-${device}`);
}

function setPopover(open) {
  popoverOpen = open;
  if (popover) popover.hidden = !open;
  if (dotBtn) dotBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (popoverText) popoverText.textContent = statusDetailText();
}

function setHubExpanded(open) {
  if (!hub) return;
  hub.classList.toggle("device-hub-collapsed", !open);
  if (summaryBtn) summaryBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function refreshSummary() {
  const { line } = buildStatusLine(networkStatus);
  if (summaryText) summaryText.textContent = line;
  applyDot();
  if (popoverOpen && popoverText) popoverText.textContent = statusDetailText();
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

if (hub) {
  setHubExpanded(false);
}

summaryBtn?.addEventListener("click", () => {
  setPopover(false);
  if (hub) {
    const open = hub.classList.contains("device-hub-collapsed");
    setHubExpanded(open);
    return;
  }
  const walletHub = document.getElementById("wallet-device-hub");
  walletHub?.scrollIntoView({ behavior: "smooth", block: "start" });
});

dotBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPopover(!popoverOpen);
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
      setHubExpanded(false);
    }
  }
});

refreshNetwork();
refreshSummary();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshNetwork();
});

window.addEventListener("storage", (e) => {
  if (e.key === "hc_wallet" || e.key === "hc_device_pins" || e.key === "hc_created") {
    refreshSummary();
  }
});

window.addEventListener("hc-device-hub-changed", refreshSummary);
