/**
 * Hub steward vouch product guidance card (S4).
 */
import { HUB_RESTORE_GROUP_LABEL } from "./device-ownership-copy-core.mjs";
import { getWalletCount } from "./device-wallet.mjs";
import { isIosWebKitUserAgent } from "./safari-itp-storage-notice-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  hubStewardVouchGuidanceVariant,
  shouldShowHubStewardVouchGuidance,
} from "./device-hub-steward-vouch-guidance-core.mjs";
import { hubStewardVouchGuidanceCardBodyHtml } from "./device-hub-steward-vouch-guidance-html.mjs";

let listenersBound = false;
/** @type {"pwa" | "safari" | null} */
let lastRenderedVariant = null;

function restoreGroupLabelEl(root) {
  return (
    root.querySelector("#device-hub-restore-group-label") ||
    document.getElementById("device-hub-restore-group-label")
  );
}

function guidanceSlot(root) {
  return (
    root.querySelector("#device-hub-steward-vouch-guidance") ||
    document.getElementById("device-hub-steward-vouch-guidance")
  );
}

function applyRestoreGroupLabel(root) {
  const label = restoreGroupLabelEl(root);
  if (label) label.textContent = HUB_RESTORE_GROUP_LABEL;
}

function hideGuidanceCard(slot) {
  if (!slot) return;
  slot.hidden = true;
  slot.innerHTML = "";
  slot.classList.remove(
    "hc-emphasis-card",
    "hc-emphasis-card--info",
    "device-hub-steward-vouch-guidance"
  );
  lastRenderedVariant = null;
}

function syncHubStewardVouchGuidance(root = document) {
  applyRestoreGroupLabel(root);

  const slot = guidanceSlot(root);
  if (!slot) return;

  const input = {
    isIosWebKit: isIosWebKitUserAgent(navigator.userAgent, navigator),
    standalone: readStandaloneModeFromWindow(window),
    walletCount: getWalletCount(),
  };

  if (!shouldShowHubStewardVouchGuidance(input)) {
    hideGuidanceCard(slot);
    return;
  }

  const variant = hubStewardVouchGuidanceVariant(input);
  if (lastRenderedVariant === variant && slot.innerHTML && !slot.hidden) {
    return;
  }

  slot.className = "hc-emphasis-card hc-emphasis-card--info device-hub-steward-vouch-guidance";
  slot.innerHTML = hubStewardVouchGuidanceCardBodyHtml(variant);
  slot.hidden = false;
  lastRenderedVariant = variant;
}

function bindGuidanceListeners() {
  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener("hc-device-hub-changed", () => syncHubStewardVouchGuidance());
  window.addEventListener("hc-device-os-refreshed", () => syncHubStewardVouchGuidance());
}

/**
 * @param {Document | HTMLElement | null} [root]
 */
export function initHubStewardVouchGuidance(root) {
  bindGuidanceListeners();
  syncHubStewardVouchGuidance(root ?? document);
}
