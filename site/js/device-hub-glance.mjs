/**
 * Compact hub summary: landing when sheet is collapsed; /wallet/ always when non-empty.
 */
import { getInboxItems } from "./device-inbox.mjs";
import { openInboxFromChrome } from "./device-inbox-sheet.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { actOnOtherTabKeys, openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import {
  getLatestResolvedAlertState,
  getLatestResolvedScanKind,
  getNetworkLastSeenBaseline,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import {
  CARD_DISABLED_SINCE_VISIT_GLANCE_SUFFIX,
  cardDisabledSinceVisitVisible,
} from "./wallet-network-baseline.mjs";
import { loadWallet, walletEntrySubtitle } from "./device-wallet.mjs";

const GLANCE_MAX_CARDS = 3;

/** @type {{ root: HTMLElement, list: HTMLElement, hub: HTMLElement | null, wallet: boolean }[]} */
const glanceTargets = [];

let glanceHasRenderableContent = false;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function closeGlancePopoverEvent() {
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
}

function expandHub(targetId) {
  closeGlancePopoverEvent();
  window.dispatchEvent(
    new CustomEvent("hc-hub-expand-request", { detail: { targetId: targetId ?? null } })
  );
}

function registerGlanceTarget(id, listId, hubId, wallet) {
  const root = document.getElementById(id);
  const list = document.getElementById(listId);
  if (!root || !list) return;
  const hub = hubId ? document.getElementById(hubId) : null;
  glanceTargets.push({ root, list, hub, wallet });
}

registerGlanceTarget("device-hub-glance-popover", "device-hub-glance-list", "device-hub", false);

function glanceCopy(wallet) {
  return wallet
    ? {
        liveProofSub: "Tap to view waiting proofs",
        moreSub: "Tap to view all saved",
      }
    : {
        liveProofSub: "Tap to open hub and sign",
        moreSub: "Tap to open hub",
      };
}

/**
 * @param {import("./device-inbox-core.mjs").InboxItem} item
 * @param {HTMLElement} list
 * @param {{ liveProofSub: string }} copy
 */
function appendInboxGlanceRow(item, list, copy) {
  const li = document.createElement("li");

  if (item.kind === "live_proof") {
    li.className = "device-hub-glance-row device-hub-glance-row--liveproof";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(item.title)}</span>
        <span class="device-hub-glance-sub">${escapeHtml(copy.liveProofSub)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      openInboxFromChrome();
    });
    list.appendChild(li);
    return;
  }

  if (item.kind === "cross_tab_keys") {
    const entry = item.meta?.crossTabEntry;
    if (!entry) return;
    li.className = "device-hub-glance-row device-hub-glance-row--crosstab";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(item.title)}</span>
        <span class="device-hub-glance-sub">${escapeHtml(item.subtitle ?? "")}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      if (!actOnOtherTabKeys(entry)) {
        refreshHubGlance();
      }
    });
    list.appendChild(li);
    return;
  }

  if (item.kind === "tab_keys_unsaved") {
    li.className = "device-hub-glance-row device-hub-glance-row--notice";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(item.title)}</span>
        <span class="device-hub-glance-sub">${escapeHtml(item.subtitle ?? "")}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      openSaveKeysForThisTab();
    });
    list.appendChild(li);
  }
}

/**
 * @param {{ root: HTMLElement, list: HTMLElement, hub: HTMLElement | null, wallet: boolean }} target
 */
function refreshGlanceTarget(target) {
  const { root, list, wallet } = target;
  const copy = glanceCopy(wallet);
  const inboxItems = getInboxItems();
  const entries = loadWallet();
  const hasCards = entries.length > 0;

  if (!hasCards && inboxItems.length === 0) {
    root.hidden = true;
    return;
  }

  glanceHasRenderableContent = true;
  list.innerHTML = "";

  for (const item of inboxItems) {
    appendInboxGlanceRow(item, list, copy);
  }

  const shown = entries.slice(0, GLANCE_MAX_CARDS);
  for (const entry of shown) {
    const li = document.createElement("li");
    const alertState = getLatestResolvedAlertState(entry.profile_id);
    const revokedSince =
      alertState != null &&
      cardDisabledSinceVisitVisible(
        alertState,
        getNetworkLastSeenBaseline(entry.profile_id),
        getLatestResolvedScanKind(entry.profile_id),
        true
      );
    li.className = revokedSince
      ? "device-hub-glance-row device-hub-glance-row--revoked"
      : "device-hub-glance-row";
    const sub = walletEntrySubtitle(entry);
    const subLine = revokedSince ? `${sub} · ${CARD_DISABLED_SINCE_VISIT_GLANCE_SUFFIX}` : sub;
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(entry.label)}</span>
        <span class="device-hub-glance-sub">${escapeHtml(subLine)} · Saved on device</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      closeGlancePopoverEvent();
      openCardNowPage(entry);
    });
    list.appendChild(li);
  }

  const remaining = entries.length - shown.length;
  if (remaining > 0) {
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--more";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn device-hub-glance-btn--muted">
        <span class="device-hub-glance-title">${remaining} more saved on this device</span>
        <span class="device-hub-glance-sub">${escapeHtml(copy.moreSub)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub(wallet ? "device-hub-saved-group" : null);
    });
    list.appendChild(li);
  }
}

export function hubGlanceHasContent() {
  return glanceHasRenderableContent;
}

export function refreshHubGlance() {
  if (glanceTargets.length === 0) return;
  glanceHasRenderableContent = false;
  for (const target of glanceTargets) {
    refreshGlanceTarget(target);
  }
  if (!glanceHasRenderableContent) {
    closeGlancePopoverEvent();
  }
}

if (glanceTargets.length > 0) {
  refreshHubGlance();
  window.addEventListener("hc-device-hub-changed", refreshHubGlance);
  window.addEventListener(NETWORK_REFRESHED, refreshHubGlance);
  window.addEventListener("hc-live-control-inbox-changed", refreshHubGlance);
  window.addEventListener("hc-tab-presence-changed", refreshHubGlance);
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_created" || e.key === "hc_tab_keys_presence") {
      refreshHubGlance();
    }
  });
}
