/**
 * Landing-only compact summary when #device-hub is collapsed.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import {
  getCachedNetworkStatus,
  isRevokedSinceLastVisit,
} from "./device-wallet-network.mjs";
import { loadWallet, walletEntrySubtitle } from "./device-wallet.mjs";
const GLANCE_MAX_CARDS = 3;

const root = document.getElementById("device-hub-glance");
const list = document.getElementById("device-hub-glance-list");
const hub = document.getElementById("device-hub");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hubCollapsed() {
  return hub?.classList.contains("device-hub-collapsed") ?? true;
}

function expandHub(targetId) {
  window.dispatchEvent(
    new CustomEvent("hc-hub-expand-request", { detail: { targetId: targetId ?? null } })
  );
}

export function refreshHubGlance() {
  if (!root || !list || !hub) return;

  if (!hubCollapsed()) {
    root.hidden = true;
    return;
  }

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

  root.hidden = false;
  list.innerHTML = "";

  if (liveProof > 0) {
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--liveproof";
    const n = liveProof;
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${n} live proof waiting</span>
        <span class="device-hub-glance-sub">Tap to open hub and sign</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub("device-hub-live-control-group");
    });
    list.appendChild(li);
  }

  if (otherTabs.length > 0) {
    const entry = otherTabs[0];
    const label = entry.label || (entry.handle ? `@${entry.handle}` : `${entry.profile_id.slice(0, 12)}…`);
    const extra = otherTabs.length > 1 ? ` (+${otherTabs.length - 1} more)` : "";
    const li = document.createElement("li");
    li.className = "device-hub-glance-row device-hub-glance-row--crosstab";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">Keys in another tab</span>
        <span class="device-hub-glance-sub">${escapeHtml(label)}${escapeHtml(extra)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub(null);
    });
    list.appendChild(li);
  }

  if (notices > 0) {
    const session = getTabSession();
    const label = session?.handle
      ? `@${session.handle}`
      : session?.profile_id?.slice(0, 12) || "This tab";
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
        <span class="device-hub-glance-sub">${escapeHtml(subLine)}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub("device-hub-saved-group");
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
        <span class="device-hub-glance-sub">Tap to open hub</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      expandHub(null);
    });
    list.appendChild(li);
  }
}

if (root) {
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
