/**
 * Compact inbox bottom sheet — badge tap and open_notifications.
 * @see docs/DEVICE_INBOX.md phase 3
 */
import { buildInboxSheetRows } from "./device-inbox-core.mjs";
import { getInboxItems, notificationCount } from "./device-inbox.mjs";
import {
  formatLiveControlExpiry,
  getLiveControlPending,
  openLiveControlProof,
} from "./device-live-control-inbox.mjs";
import { actOnOtherTabKeys, openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import { shouldShowCrossTabKeysNotice } from "./device-cross-tab-visibility.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { prefersReducedMotion } from "./device-shell-motion.mjs";
import { closeGlancePopover } from "./device-hub-glance-popover.mjs";
import { syncBrowserNotifPrompts } from "./device-browser-notifications.mjs";

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
  if (document.getElementById(SHEET_ID)) return;

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = BACKDROP_ID;
  backdrop.className = "device-inbox-backdrop";
  backdrop.setAttribute("aria-label", "Close inbox");
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
  document.body.classList.toggle("device-inbox-sheet-open", open);
  chrome?.classList.toggle("top-chrome--inbox-locked", open);

  if (open && !prefersReducedMotion()) {
    sheet.scrollTop = 0;
  }
}

/** Clear stuck inbox-open classes when the sheet is collapsed (bfcache, etc.). */
export function reconcileInboxSheetState() {
  const sheet = getSheet();
  if (!sheet || !sheet.classList.contains("device-inbox-sheet--collapsed")) return;

  const bodyOpen = document.body.classList.contains("device-inbox-sheet-open");
  const locked = document.getElementById("top-chrome")?.classList.contains(
    "top-chrome--inbox-locked"
  );
  if (bodyOpen || locked || sheetOpen) {
    setInboxSheetOpen(false);
  }
}

function crossTabEntriesForSheet() {
  const notices = tabNoticeCount();
  const raw = getOtherTabsWithKeys();
  return shouldShowCrossTabKeysNotice(raw.length, notices) ? raw : [];
}

function sheetRows() {
  return buildInboxSheetRows(getInboxItems(), {
    liveProofPending: getLiveControlPending(),
    crossTabEntries: crossTabEntriesForSheet(),
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
  if (kind === "cross_tab_keys") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;
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
        openLiveControlProof(row.proofItem);
        return;
      }
      if (row.kind === "cross_tab_keys" && row.crossTabEntry) {
        actOnOtherTabKeys(row.crossTabEntry);
        return;
      }
      if (row.kind === "tab_keys_unsaved") {
        openSaveKeysForThisTab();
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

/** Open the inbox sheet (closes hub glance). */
export function openInboxFromChrome() {
  if (!document.getElementById("shell-notif-badge")) return;
  if (notificationCount() === 0) return;

  closeGlancePopover();
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));

  renderInboxSheet();
  setInboxSheetOpen(true);
  hapticTap();
}

function bindInboxSheetRefresh() {
  const refresh = () => {
    if (!sheetOpen) return;
    renderInboxSheet();
    if (notificationCount() === 0) {
      setInboxSheetOpen(false);
    }
  };
  window.addEventListener("hc-live-control-inbox-changed", refresh);
  window.addEventListener("hc-tab-presence-changed", refresh);
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_created" || e.key === "hc_wallet" || e.key === "hc_tab_keys_presence") {
      refresh();
    }
  });
}

ensureInboxSheetDom();
reconcileInboxSheetState();
bindInboxSheetRefresh();

window.addEventListener("pageshow", (e) => {
  if (e.persisted) reconcileInboxSheetState();
});

window.addEventListener("hc-inbox-sheet-close", () => {
  setInboxSheetOpen(false);
});
