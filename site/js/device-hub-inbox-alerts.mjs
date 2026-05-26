/**
 * Hub alert groups driven by unified device inbox (`getInboxItems()`).
 * @see docs/DEVICE_INBOX.md — hub alerts unification (phase 8)
 */
import { getInboxItems } from "./device-inbox.mjs";
import { inboxItemsIncludeKind, inboxWalletEntryLabel } from "./device-inbox-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import {
  formatLiveControlExpiry,
  getLiveControlPending,
  openLiveControlProof,
} from "./device-live-control-inbox.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {{
 *   noticeGroup: HTMLElement | null,
 *   liveControlGroup: HTMLElement | null,
 *   liveControlList: HTMLElement | null,
 *   noticeMode: 'created-url' | 'keys-strip',
 *   showLiveControlInbox: boolean,
 * }} ctx
 */
export function renderHubInboxAlerts(ctx) {
  const {
    noticeGroup,
    liveControlGroup,
    liveControlList,
    noticeMode,
    showLiveControlInbox,
  } = ctx;
  const items = getInboxItems();

  renderLiveProofHubGroup(
    liveControlGroup,
    liveControlList,
    showLiveControlInbox && inboxItemsIncludeKind(items, "live_proof")
  );
  renderTabKeysHubNotice(
    noticeGroup,
    inboxItemsIncludeKind(items, "tab_keys_unsaved"),
    noticeMode
  );
}

/**
 * @param {HTMLElement | null} liveControlGroup
 * @param {HTMLElement | null} liveControlList
 * @param {boolean} show
 */
function renderLiveProofHubGroup(liveControlGroup, liveControlList, show) {
  if (!liveControlGroup || !liveControlList) {
    if (liveControlGroup) liveControlGroup.hidden = true;
    return;
  }

  liveControlList.innerHTML = "";
  if (!show) {
    liveControlGroup.hidden = true;
    return;
  }

  const pending = getLiveControlPending();
  if (pending.length === 0) {
    liveControlGroup.hidden = true;
    return;
  }

  liveControlGroup.hidden = false;
  for (const item of pending) {
    const label = inboxWalletEntryLabel(item.entry);
    const expiry = item.expires_at ? formatLiveControlExpiry(item.expires_at) : "";
    const sub = expiry ? `Someone is waiting · ${expiry}` : "Someone is waiting";

    const li = document.createElement("li");
    li.className = "list-row list-action device-live-control-row";
    li.dataset.hubSearchable =
      `live proof waiting ${label} ${item.entry.profile_id || ""}`.toLowerCase();
    li.innerHTML = `
      <button type="button" class="device-live-control-open">
        <span class="list-icon list-icon-tone-gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4"/><path d="M12 18v4"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron" aria-hidden="true">›</span>
      </button>`;
    li.querySelector(".device-live-control-open")?.addEventListener("click", () => {
      openLiveControlProof(item);
    });
    liveControlList.appendChild(li);
  }
}

/**
 * @param {HTMLElement | null} noticeGroup
 * @param {boolean} show
 * @param {'created-url' | 'keys-strip'} noticeMode
 */
function renderTabKeysHubNotice(noticeGroup, show, noticeMode) {
  if (!noticeGroup) return;
  noticeGroup.hidden = !show;
  if (!show) {
    noticeGroup.innerHTML = "";
    return;
  }

  const session = getTabSession();
  const label = session?.handle
    ? `@${session.handle}`
    : session?.profile_id?.slice(0, 12) || "This tab";

  if (noticeMode === "keys-strip") {
    noticeGroup.innerHTML = `
    <button type="button" class="device-hub-notice-banner" data-hub-go-now-tab data-hub-searchable="notice save tab keys strip">
      <span class="device-hub-notice-title">Keys in this tab · Save on this device</span>
      <span class="device-hub-notice-sub">${escapeHtml(label)} · open the Now tab to save</span>
      <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
    </button>`;
    noticeGroup.querySelector("[data-hub-go-now-tab]")?.addEventListener("click", () => {
      openSaveKeysForThisTab();
    });
    return;
  }

  const url = new URL("/created/", location.origin);
  if (session?.profile_id) url.searchParams.set("profile_id", session.profile_id);
  if (session?.qr_id) url.searchParams.set("qr_id", session.qr_id);

  noticeGroup.innerHTML = `
    <a class="device-hub-notice-banner" href="${escapeHtml(url.href)}" data-hub-searchable="notice save tab keys">
      <span class="device-hub-notice-title">Keys in this tab · Save on this device</span>
      <span class="device-hub-notice-sub">${escapeHtml(label)} · tab only until you save on this device</span>
      <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
    </a>`;
}

export { inboxItemsIncludeKind } from "./device-inbox-core.mjs";
