/**
 * Hub alert groups driven by unified device inbox (`getInboxItems()`).
 * @see docs/DEVICE_INBOX.md - hub alerts unification (phase 8)
 */
import { getInboxItems } from "./device-inbox.mjs";
import { inboxItemsIncludeKind, inboxWalletEntryLabel } from "./device-inbox-core.mjs";
import { hasUnifiedHubKeysCustodyPanel } from "./device-hub-keys-custody.mjs";
import { shouldShowLegacyTabKeysHubNotice } from "./device-legacy-cross-tab-chrome-core.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { CARD_DISABLED_SINCE_VISIT_ALERT_TEXT } from "./wallet-network-baseline.mjs";
import { openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import {
  formatLiveControlExpiry,
  getLiveControlPending,
  liveProofInboxRowSubtitle,
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
 *   cardDisabledGroup: HTMLElement | null,
 *   cardDisabledList: HTMLElement | null,
 *   noticeMode: 'created-url' | 'keys-strip',
 *   showLiveControlInbox: boolean,
 * }} ctx
 */
export function renderHubInboxAlerts(ctx) {
  const {
    noticeGroup,
    liveControlGroup,
    liveControlList,
    cardDisabledGroup,
    cardDisabledList,
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
  renderCardDisabledHubGroup(
    cardDisabledGroup,
    cardDisabledList,
    inboxItemsIncludeKind(items, "card_disabled_since_visit"),
    items
  );
}

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 */
function cardDisabledEntriesFromItems(items) {
  const item = items.find((i) => i.kind === "card_disabled_since_visit");
  return item?.meta?.cardDisabledEntries ?? [];
}

/**
 * @param {HTMLElement | null} group
 */
function resetCardDisabledHubSummary(group) {
  if (!group) return;
  const summaryEl = group.querySelector("#device-hub-card-disabled-summary");
  const eyebrowEl = group.querySelector("#device-hub-card-disabled-eyebrow");
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent = "";
    summaryEl.hidden = true;
  }
  if (eyebrowEl instanceof HTMLElement) {
    eyebrowEl.textContent = "Disabled since your last visit";
  }
}

/**
 * @param {HTMLElement | null} group
 * @param {HTMLElement | null} list
 * @param {boolean} show
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 */
function renderCardDisabledHubGroup(group, list, show, items) {
  if (!group || !list) {
    if (group) group.hidden = true;
    return;
  }

  list.innerHTML = "";
  if (!show) {
    group.hidden = true;
    resetCardDisabledHubSummary(group);
    return;
  }

  const entries = cardDisabledEntriesFromItems(items);
  if (entries.length === 0) {
    group.hidden = true;
    resetCardDisabledHubSummary(group);
    return;
  }

  group.hidden = false;
  const sub = CARD_DISABLED_SINCE_VISIT_ALERT_TEXT;
  const eyebrowEl = group.querySelector("#device-hub-card-disabled-eyebrow");
  const summaryEl = group.querySelector("#device-hub-card-disabled-summary");
  const n = entries.length;
  if (eyebrowEl instanceof HTMLElement) {
    eyebrowEl.textContent =
      n === 1 ? "Disabled since your last visit" : `${n} cards disabled since your last visit`;
  }
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent =
      n === 1
        ? "This card was disabled on the network since your last visit. Tap below to review."
        : `${n} cards were disabled on the network since your last visit. Tap one below to review.`;
    summaryEl.hidden = false;
  }

  for (const card of entries) {
    const label = inboxWalletEntryLabel(card);
    const li = document.createElement("li");
    li.className = "list-row list-action device-hub-card-disabled-row";
    li.dataset.hubSearchable =
      `card disabled since last visit ${label} ${card.profile_id || ""}`.toLowerCase();
    li.innerHTML = `
      <button type="button" class="device-hub-card-disabled-open">
        <span class="list-icon list-icon-tone-red" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron" aria-hidden="true">›</span>
      </button>`;
    li.querySelector(".device-hub-card-disabled-open")?.addEventListener("click", () => {
      const entry = findWalletEntryByProfileId(card.profile_id);
      if (entry) openCardNowPage(entry);
    });
    list.appendChild(li);
  }
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
    const summaryEl = liveControlGroup.querySelector("#device-hub-live-control-summary");
    if (summaryEl instanceof HTMLElement) {
      summaryEl.textContent = "";
      summaryEl.hidden = true;
    }
    return;
  }

  liveControlGroup.hidden = false;

  const summaryEl = liveControlGroup.querySelector("#device-hub-live-control-summary");
  const eyebrowEl = liveControlGroup.querySelector("#device-hub-live-control-eyebrow");
  const n = pending.length;
  if (eyebrowEl instanceof HTMLElement) {
    eyebrowEl.textContent = n === 1 ? "Live proof waiting" : `${n} live proofs waiting`;
  }
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent =
      n === 1
        ? "Someone nearby asked for live proof. Tap a card below to sign."
        : `${n} cards need your signature. Tap one below.`;
    summaryEl.hidden = false;
  }

  for (const item of pending) {
    const label = inboxWalletEntryLabel(item.entry);
    const expiry = item.expires_at ? formatLiveControlExpiry(item.expires_at) : "";
    const sub = liveProofInboxRowSubtitle(expiry);

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
  const hasShellBadge = Boolean(document.getElementById("shell-notif-badge"));
  if (
    !shouldShowLegacyTabKeysHubNotice(
      hasShellBadge,
      hasUnifiedHubKeysCustodyPanel()
    )
  ) {
    noticeGroup.hidden = true;
    noticeGroup.innerHTML = "";
    return;
  }
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
      <span class="device-hub-notice-title">Control active · Save ownership on this device</span>
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
      <span class="device-hub-notice-title">Control active · Save ownership on this device</span>
      <span class="device-hub-notice-sub">${escapeHtml(label)} · this tab only until you save ownership</span>
      <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
    </a>`;
}

export { inboxItemsIncludeKind } from "./device-inbox-core.mjs";
