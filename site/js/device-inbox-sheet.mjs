/**
 * Compact inbox bottom sheet — badge tap and open_notifications.
 * @see docs/DEVICE_INBOX.md phase 3
 */
import { buildInboxItems, buildInboxSheetRows } from "./device-inbox-core.mjs?v=79";
import { gatherInboxInput, getInboxItems, notificationCount } from "./device-inbox.mjs?v=79";
import {
  formatLiveControlExpiry,
  getLiveControlPending,
  LIVE_CONTROL_POLL_SCOPE_CHANGED,
  openLiveControlProof,
} from "./device-live-control-inbox.mjs";
import { openCardNowPage } from "./device-keys.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  actOnOrphanRemovedTabKeys,
} from "./device-orphan-keys-nav.mjs";
import { actOnOtherTabKeys, openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "./device-inbox-card-disabled.mjs?v=79";
import {
  NETWORK_BASELINE_CHANGED,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import { prefersReducedMotion } from "./device-shell-motion.mjs";
import { closeGlancePopover } from "./device-hub-glance-popover.mjs";
import { syncBrowserNotifPrompts } from "./device-browser-notifications-loader.mjs?v=79";
import { logInboxDiagnostic } from "./device-inbox-diagnostics.mjs?v=79";
import {
  inboxSheetMountAllowed,
  inboxSheetReconcileAction,
} from "./device-inbox-sheet-core.mjs?v=79";
import {
  bindSheetLifecycleReconcile,
  syncInboxBackdropForOpenHub,
  syncSheetBackdropClosed,
} from "./device-sheet-backdrop-sync.mjs?v=79";

const SHEET_ID = "device-inbox-sheet";
const LIST_ID = "device-inbox-sheet-list";
const BACKDROP_ID = "device-inbox-backdrop";

let sheetOpen = false;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hapticTap() {
  try {
    navigator.vibrate?.(1);
  } catch {
    /* ignore */
  }
}

function getSheet() {
  return document.getElementById(SHEET_ID);
}

function getList() {
  return document.getElementById(LIST_ID);
}

function ensureInboxSheetDom() {
  if (!inboxSheetMountAllowed(document)) return;
  if (document.getElementById(SHEET_ID)) return;

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = BACKDROP_ID;
  backdrop.className = "device-inbox-backdrop";
  backdrop.setAttribute("aria-label", "Close inbox");
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  backdrop.addEventListener("click", () => {
    setInboxSheetOpen(false);
  });

  const sheet = document.createElement("section");
  sheet.id = SHEET_ID;
  sheet.className = "device-inbox-sheet device-inbox-sheet--collapsed";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Needs attention");
  sheet.setAttribute("aria-hidden", "true");
  sheet.setAttribute("inert", "");
  sheet.innerHTML = `
    <div class="device-inbox-sheet-body">
      <div class="device-inbox-sheet-handle" aria-hidden="true"></div>
      <button type="button" class="device-inbox-sheet-close" aria-label="Close">×</button>
      <h2 class="device-inbox-sheet-title">Needs attention</h2>
      <ul class="device-inbox-sheet-list list list-compact" id="${LIST_ID}"></ul>
      <div class="device-inbox-sheet-footer" id="device-inbox-sheet-footer" hidden></div>
    </div>`;

  sheet.querySelector(".device-inbox-sheet-close")?.addEventListener("click", () => {
    setInboxSheetOpen(false);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
}

export function isInboxSheetOpen() {
  return sheetOpen;
}

/**
 * @param {boolean} open
 */
export function setInboxSheetOpen(open) {
  ensureInboxSheetDom();
  const sheet = getSheet();
  const backdrop = document.getElementById(BACKDROP_ID);
  const chrome = document.getElementById("top-chrome");
  if (!sheet || !backdrop) return;

  sheetOpen = open;
  sheet.classList.toggle("device-inbox-sheet--collapsed", !open);
  sheet.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    sheet.removeAttribute("inert");
  } else {
    sheet.setAttribute("inert", "");
  }
  backdrop.hidden = !open;
  backdrop.classList.toggle("is-visible", open);
  backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  if (!open) syncSheetBackdropClosed(backdrop);
  document.body.classList.toggle("device-inbox-sheet-open", open);
  chrome?.classList.toggle("top-chrome--inbox-locked", open);

  if (open && !prefersReducedMotion()) {
    sheet.scrollTop = 0;
  } else if (!open) {
    reconcileInboxSheetState();
  }
  window.dispatchEvent(new Event(LIVE_CONTROL_POLL_SCOPE_CHANGED));
}

/** Clear stuck inbox-open classes when the sheet is collapsed (bfcache, etc.). */
export function reconcileInboxSheetState() {
  syncInboxBackdropForOpenHub();
  const sheet = getSheet();
  if (!sheet) return;

  const backdrop = document.getElementById(BACKDROP_ID);
  const action = inboxSheetReconcileAction({
    sheetCollapsed: sheet.classList.contains("device-inbox-sheet--collapsed"),
    bodySheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
    chromeInboxLocked:
      document.getElementById("top-chrome")?.classList.contains("top-chrome--inbox-locked") ??
      false,
    sheetOpenFlag: sheetOpen,
    backdropHidden: backdrop?.hidden !== false,
    backdropVisibleClass: backdrop?.classList.contains("is-visible") ?? false,
  });

  if (action === "close_sheet") {
    setInboxSheetOpen(false);
    return;
  }
  if (action === "hide_backdrop" && backdrop) {
    syncSheetBackdropClosed(backdrop);
  }
}

function sheetRows() {
  const input = gatherInboxInput();
  const cardDisabled = gatherCardDisabledSinceVisitForInbox().map((entry) => ({
    profile_id: entry.profile_id,
    label: entry.label,
    handle: entry.handle,
  }));
  return buildInboxSheetRows(buildInboxItems(input), {
    liveProofPending: getLiveControlPending(),
    crossTabEntries: input.crossTabEntries,
    orphanRemovedEntries: input.orphanRemovedEntries,
    cardDisabledSinceVisit: cardDisabled,
    formatProofExpiry: formatLiveControlExpiry,
  });
}

function toneClass(tone) {
  if (tone === "gold") return "list-icon-tone-gold";
  if (tone === "blue") return "list-icon-tone-blue";
  return "list-icon-tone-red";
}

function rowIconSvg(kind) {
  if (kind === "live_proof") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4"/><path d="M12 18v4"/><circle cx="12" cy="12" r="4"/></svg>`;
  }
  if (kind === "cross_tab_keys" || kind === "other_tabs_unsaved_keys" || kind === "orphan_keys_removed") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;
  }
  if (kind === "card_disabled_since_visit") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
}

export function renderInboxSheet() {
  ensureInboxSheetDom();
  const list = getList();
  if (!list) return;

  const rows = sheetRows();
  list.innerHTML = "";

  const footer = document.getElementById("device-inbox-sheet-footer");
  if (rows.length === 0) {
    const empty = document.createElement("li");
    empty.className = "device-inbox-sheet-empty";
    empty.textContent = "Nothing needs attention right now.";
    list.appendChild(empty);
    if (footer) footer.hidden = true;
    return;
  }

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = `list-row list-action device-inbox-sheet-row device-inbox-sheet-row--${row.kind}`;
    li.innerHTML = `
      <button type="button" class="device-inbox-sheet-row-btn">
        <span class="list-icon ${toneClass(row.tone)}" aria-hidden="true">${rowIconSvg(row.kind)}</span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(row.title)}</span>
          <span class="list-sub">${escapeHtml(row.subtitle)}</span>
        </span>
        <span class="list-chevron" aria-hidden="true">›</span>
      </button>`;

    li.querySelector("button")?.addEventListener("click", () => {
      setInboxSheetOpen(false);
      window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
      window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));

      if (row.kind === "live_proof" && row.proofItem) {
        logInboxDiagnostic({ type: "inbox_item_action", kind: row.kind, outcome: "open_sign" });
        openLiveControlProof(row.proofItem);
        return;
      }
      if (
        (row.kind === "cross_tab_keys" || row.kind === "other_tabs_unsaved_keys") &&
        row.crossTabEntry
      ) {
        logInboxDiagnostic({
          type: "inbox_item_action",
          kind: row.kind,
          outcome: "focus_other_tab",
        });
        actOnOtherTabKeys(row.crossTabEntry);
        return;
      }
      if (row.kind === "orphan_keys_removed" && row.crossTabEntry) {
        logInboxDiagnostic({
          type: "inbox_item_action",
          kind: row.kind,
          outcome: "focus_other_tab",
        });
        actOnOrphanRemovedTabKeys(row.crossTabEntry);
        return;
      }
      if (row.kind === "tab_keys_unsaved") {
        logInboxDiagnostic({ type: "inbox_item_action", kind: row.kind, outcome: "save_keys" });
        openSaveKeysForThisTab();
        return;
      }
      if (row.kind === "card_disabled_since_visit" && row.cardDisabledEntry) {
        logInboxDiagnostic({ type: "inbox_item_action", kind: row.kind, outcome: "open_card" });
        const entry = findWalletEntryByProfileId(row.cardDisabledEntry?.profile_id);
        if (entry) openCardNowPage(entry);
      }
    });

    list.appendChild(li);
  }

  if (footer) {
    const hasLiveProof = rows.some((r) => r.kind === "live_proof");
    footer.hidden = !hasLiveProof;
    if (hasLiveProof) {
      syncBrowserNotifPrompts();
    }
  }
}

/**
 * Open the inbox sheet (closes hub glance).
 * @param {import("./device-inbox-diagnostics-core.mjs").InboxOpenSource} [source]
 */
export function openInboxFromChrome(source) {
  if (!document.getElementById("shell-notif-badge")) return;
  if (notificationCount() === 0) return;

  logInboxDiagnostic({ type: "inbox_open", source: source ?? "hub" });

  closeGlancePopover();
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));

  renderInboxSheet();
  setInboxSheetOpen(true);
  hapticTap();
}

function bindInboxSheetRefresh() {
  // Phase 2: device-chrome-refresh owns cross-tab and inbox refresh scheduling.
  // Keep only live-proof and network baseline updates here so the sheet stays fresh
  // even when cross-tab listeners are consolidated.
  const refresh = () => {
    if (!sheetOpen) return;
    renderInboxSheet();
    if (notificationCount() === 0) {
      setInboxSheetOpen(false);
    }
  };
  window.addEventListener("hc-live-control-inbox-changed", refresh);
  window.addEventListener(NETWORK_BASELINE_CHANGED, refresh);
  window.addEventListener(NETWORK_REFRESHED, refresh);
}

if (inboxSheetMountAllowed(document)) {
  ensureInboxSheetDom();
  reconcileInboxSheetState();
  bindInboxSheetRefresh();
  bindSheetLifecycleReconcile(reconcileInboxSheetState);
}

window.addEventListener("hc-inbox-sheet-close", () => {
  setInboxSheetOpen(false);
});
