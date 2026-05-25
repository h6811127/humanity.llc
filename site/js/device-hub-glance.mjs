/**
 * Compact hub summary: landing when sheet is collapsed; /wallet/ always when non-empty.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getOtherTabsWithKeys, requestFocusTab } from "./device-tab-presence.mjs";
import {
  getCachedNetworkStatus,
  isRevokedSinceLastVisit,
} from "./device-wallet-network.mjs";
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
 * @param {{ root: HTMLElement, list: HTMLElement, hub: HTMLElement | null, wallet: boolean }} target
 */
function refreshGlanceTarget(target) {
  const { root, list, hub, wallet } = target;
  const copy = glanceCopy(wallet);

  const entries = loadWallet();
  const notices = tabNoticeCount();
  const liveProof = getLiveControlPendingCount();
  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  const otherTabs = thisHasKeys || notices > 0 ? [] : getOtherTabsWithKeys();
  const hasCards = entries.length > 0;

  if (!hasCards && notices === 0 && liveProof === 0 && otherTabs.length === 0) {
    root.hidden = true;
    return;
  }

  glanceHasRenderableContent = true;
  list.innerHTML = "";

  if (liveProof > 0) {
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--liveproof";
    const n = liveProof;
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${n} live proof waiting</span>
        <span class="device-hub-glance-sub">${escapeHtml(copy.liveProofSub)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub("device-hub-live-control-group");
    });
    list.appendChild(li);
  }

  if (otherTabs.length > 0) {
    const entry = otherTabs[0];
    const label =
      entry.label || (entry.handle ? `@${entry.handle}` : `${entry.profile_id.slice(0, 12)}…`);
    const extra = otherTabs.length > 1 ? ` (+${otherTabs.length - 1} more)` : "";
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--crosstab";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">Keys in another tab</span>
        <span class="device-hub-glance-sub">${escapeHtml(label)}${escapeHtml(extra)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      if (entry.tabId) requestFocusTab(entry.tabId);
      expandHub(wallet ? "device-hub-crosstab-notice" : null);
    });
    list.appendChild(li);
  }

  if (notices > 0) {
    const tabSession = getTabSession();
    const label = tabSession?.handle
      ? `@${tabSession.handle}`
      : tabSession?.profile_id?.slice(0, 12) || "This tab";
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--notice";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">Keys in this tab · save</span>
        <span class="device-hub-glance-sub">${escapeHtml(label)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub("device-hub-notice-group");
    });
    list.appendChild(li);
  }

  const shown = entries.slice(0, GLANCE_MAX_CARDS);
  for (const entry of shown) {
    const li = document.createElement("li");
    const status = getCachedNetworkStatus(entry.profile_id) ?? entry.status;
    const revokedSince = isRevokedSinceLastVisit(entry.profile_id, status);
    li.className = revokedSince
      ? "device-hub-glance-row device-hub-glance-row--revoked"
      : "device-hub-glance-row";
    const sub = walletEntrySubtitle(entry);
    const subLine = revokedSince ? `${sub} · Revoked since last visit` : sub;
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
  window.addEventListener("hc-live-control-inbox-changed", refreshHubGlance);
  window.addEventListener("hc-tab-presence-changed", refreshHubGlance);
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_created" || e.key === "hc_tab_keys_presence") {
      refreshHubGlance();
    }
  });
}
