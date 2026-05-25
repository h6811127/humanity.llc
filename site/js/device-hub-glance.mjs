/**
 * Landing-only compact summary when #device-hub is collapsed.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
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
  const hasCards = entries.length > 0;

  if (!hasCards && notices === 0) {
    root.hidden = true;
    return;
  }

  root.hidden = false;
  list.innerHTML = "";

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
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_created") refreshHubGlance();
  });
}
