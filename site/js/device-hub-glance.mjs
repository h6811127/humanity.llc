/**
 * Compact hub summary: landing when sheet is collapsed; /wallet/ always when non-empty.
 */
import { buildGlanceRowPlan } from "./device-inbox-core.mjs";
import { getInboxItems } from "./device-inbox.mjs";
import { openInboxFromChrome } from "./device-inbox-sheet-loader.mjs?v=34";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { actOnOrphanRemovedTabKeys } from "./device-orphan-keys-nav.mjs";
import { actOnOtherTabKeys, openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import {
  getLatestResolvedAlertState,
  getLatestResolvedScanKind,
  getNetworkLastSeenBaseline,
  shouldSuppressCardDisabledSinceVisitForProfile,
  NETWORK_BASELINE_CHANGED,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import { shouldSuppressCardDisabledSinceVisitAlerts } from "./device-wallet-since-visit-gate.mjs";
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
        liveProofSub: "Tap to open inbox",
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
      openInboxFromChrome("glance");
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

  if (item.kind === "orphan_keys_removed") {
    const entry = item.meta?.crossTabEntry;
    if (!entry) return;
    li.className = "device-hub-glance-row device-hub-glance-row--crosstab device-hub-glance-row--orphan";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(item.title)}</span>
        <span class="device-hub-glance-sub">${escapeHtml(item.subtitle ?? "")}</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      actOnOrphanRemovedTabKeys(entry);
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
    return;
  }

  if (item.kind === "card_disabled_since_visit") {
    li.className = "device-hub-glance-row device-hub-glance-row--revoked";
    li.innerHTML = `
      <button type="button" class="device-hub-glance-btn">
        <span class="device-hub-glance-title">${escapeHtml(item.title)}</span>
        <span class="device-hub-glance-sub">Tap to open inbox</span>
      </button>`;
    li.querySelector("button")?.addEventListener("click", () => {
      openInboxFromChrome("glance");
    });
    list.appendChild(li);
  }
}

/**
 * Profile ids that should show the since-visit suffix on saved-card glance rows
 * (resolver-confirmed; skipped when card_disabled inbox row exists).
 * @param {Array<{ profile_id: string }>} entries
 * @returns {Set<string>}
 */
function revokedHintProfileIdsFromEntries(entries) {
  if (shouldSuppressCardDisabledSinceVisitAlerts()) return new Set();
  const ids = new Set();
  for (const entry of entries) {
    const pid = entry.profile_id;
    if (!pid || shouldSuppressCardDisabledSinceVisitForProfile(pid)) continue;
    const alertState = getLatestResolvedAlertState(pid);
    if (
      alertState != null &&
      cardDisabledSinceVisitVisible(
        alertState,
        getNetworkLastSeenBaseline(pid),
        getLatestResolvedScanKind(pid),
        true
      )
    ) {
      ids.add(pid);
    }
  }
  return ids;
}

/**
 * @param {import("./device-inbox-core.mjs").GlanceWalletEntry} entry
 * @param {boolean} revokedHint
 * @param {HTMLElement} list
 */
function appendWalletGlanceRow(entry, revokedHint, list) {
  const li = document.createElement("li");
  li.className = revokedHint
    ? "device-hub-glance-row device-hub-glance-row--revoked"
    : "device-hub-glance-row";
  const sub = walletEntrySubtitle(entry);
  const subLine = revokedHint ? `${sub} · ${CARD_DISABLED_SINCE_VISIT_GLANCE_SUFFIX}` : sub;
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

/**
 * @param {number} remaining
 * @param {HTMLElement} list
 * @param {{ moreSub: string }} copy
 * @param {boolean} wallet
 */
function appendMoreGlanceRow(remaining, list, copy, wallet) {
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

/**
 * @param {{ root: HTMLElement, list: HTMLElement, hub: HTMLElement | null, wallet: boolean }} target
 */
function refreshGlanceTarget(target) {
  const { root, list, wallet } = target;
  const copy = glanceCopy(wallet);
  const inboxItems = getInboxItems();
  const entries = loadWallet();
  const plan = buildGlanceRowPlan(inboxItems, entries, {
    maxSavedCards: GLANCE_MAX_CARDS,
    revokedHintProfileIds: revokedHintProfileIdsFromEntries(entries),
  });

  if (plan.length === 0) {
    root.hidden = true;
    return;
  }

  glanceHasRenderableContent = true;
  list.innerHTML = "";

  for (const row of plan) {
    if (row.type === "inbox") {
      appendInboxGlanceRow(row.item, list, copy);
    } else if (row.type === "wallet") {
      appendWalletGlanceRow(row.entry, row.revokedHint, list);
    } else {
      appendMoreGlanceRow(row.remainingCount, list, copy, wallet);
    }
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
  window.addEventListener(NETWORK_BASELINE_CHANGED, refreshHubGlance);
  window.addEventListener("hc-live-control-inbox-changed", refreshHubGlance);
  // Phase 2: device-chrome-refresh owns cross-tab and storage-driven refresh scheduling.
}
