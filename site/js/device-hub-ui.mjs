/**
 * Shared device hub: saved rows, pins, notice, activity, backup import, search.
 */
import {
  activityHaystack,
  activityTypeLabel,
  formatActivityTime,
  lastActivityForEntry,
  loadActivity,
  HUB_RECENT_DISPLAY_LIMIT,
  logDeviceActivity,
} from "./device-activity.mjs";
import { applyDeviceHubSearch } from "./device-hub-search.mjs";
import { initHubBackupImport } from "./device-hub-import.mjs";
import { mountThemeToggles } from "./device-theme.mjs";
import { syncBrowserNotifPrompts } from "./device-browser-notifications-loader.mjs";
import { renderHubInboxAlerts, inboxItemsIncludeKind } from "./device-hub-inbox-alerts.mjs";
import { renderHubKeysCustodyPanel } from "./device-hub-keys-custody.mjs";
import { getInboxItems, notificationCount } from "./device-inbox.mjs";
import {
  buildHubCardControls,
  partitionHubCardControls,
} from "./device-hub-controls-core.mjs";
import { applyHubControlPlainLabels } from "./pilot-steward-copy.mjs";
import { inferPilotTemplate } from "./manifesto-display.mjs";
import {
  activateWalletEntry,
  getTabSession,
  openActivityNow,
  openCardControlPage,
  openCardNowPage,
} from "./device-keys.mjs";
import { loadPins, pinHaystack } from "./device-pins.mjs";
import {
  findWalletEntryById,
  findWalletEntryByProfileId,
  getWalletCount,
  listWalletDisplayEntries,
  loadWallet,
  loadWalletSummary,
  normalizeWalletQrIds,
  saveWallet,
  formatSavedAt,
  walletEntryKeyPreview,
  walletEntryQrId,
} from "./device-wallet.mjs";
import { shouldSuppressCardDisabledSinceVisitAlerts } from "./device-wallet-since-visit-gate.mjs";
import {
  getCachedNetworkSeenAt,
  getCachedNetworkScanKind,
  getCachedNetworkQrScope,
  getCachedNetworkStatus,
  getCachedVerification,
  buildResolverConfirmedWalletPollMaps,
  getLatestResolvedAlertState,
  getNetworkLastSeenBaseline,
  getWalletNetworkTruthChipStatus,
  hasLatestResolverNetworkPoll,
  CARD_REVOKED_ALERT_STATE,
  isSinceVisitBlockedChipStatus,
  recordNetworkSeen,
  listWalletEntriesNeedingNetworkFetch,
  refreshWalletNetworkStatuses,
  shouldSuppressCardDisabledSinceVisitForProfile,
  snapshotNetworkSeenOnExit,
  syncLastSeenFromNetworkMap,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import { clearWalletNetworkTruthForProfile } from "./device-wallet-network-truth.mjs";
import {
  broadcastNetworkSnapshotIfEligible,
  shouldFollowerSkipAutoNetworkFetch,
} from "./device-resolver-sync.mjs";
import {
  claimLiveControlPollLeader,
  touchLiveControlPollLeader,
} from "./device-live-control-poll-leader.mjs";
import { getCardStatusUrl } from "./hc-sign.mjs";
import {
  hubCardIdentityLine,
  hubCardStatusLine,
  hubCardTitle,
} from "./device-hub-card-row-core.mjs";
import { humanTrustIconMeta, isEligibleVoucherState } from "./human-trust-ui.mjs";
import { objectTypeLabelFromContext } from "./object-taxonomy-core.mjs";
import { purgePresenceForProfile } from "./device-tab-presence.mjs";
import { offerClearOtherTabKeysOnRemove } from "./device-notice-nav.mjs";
import { markProfileRemovedFromDevice } from "./device-wallet-removed-profiles.mjs";
import {
  clearDefaultVouchIfProfile,
  isDefaultVouchProfile,
  setDefaultVouchProfile,
} from "./vouch-ready-keys.mjs";
import {
  clearSignLock,
  getSignLock,
  isSignLockEnabled,
  isWebAuthnUnlockAvailable,
  setPinSignLock,
  setWebAuthnSignLock,
} from "./vouch-sign-lock.mjs";
import {
  CARD_DISABLED_SINCE_VISIT_ALERT_TEXT,
  CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET,
  cardDisabledSinceVisitVisible,
  normalizeBaselineState,
} from "./wallet-network-baseline.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import { mountHubBuildStamp } from "./device-hub-build-stamp.mjs";
import { mountHubNetworkTools } from "./device-hub-network-tools.mjs";
import {
  getLiveControlPending,
  openLiveControlProof,
  refreshLiveControlInbox,
  checkLiveProofNow,
  applyLiveControlWatchPreference,
  getLastLiveProofCheckAt,
  enableLiveControlInboxPolling,
  isLiveControlAutoPollBudgetPaused,
  isStewardServerQuotaPaused,
  isLiveControlInboxPollingActive,
  LIVE_CONTROL_POLL_SCOPE_CHANGED,
} from "./device-live-control-inbox.mjs";
import {
  isLargeWallet,
  walletScaleHint,
  selectHubSavedRowEntries,
  selectWalletPageSavedRowEntries,
  selectNetworkRefreshEntries,
  walletNetworkMaxParallel,
} from "./device-wallet-scale-core.mjs";
import {
  getStewardEntitlementsPolicy,
  hostedTierHubIndicatorLine,
  initStewardEntitlementsHubHook,
  refreshStewardEntitlementsOnHubContext,
} from "./device-steward-entitlements.mjs";
import {
  shouldScheduleWalletNetworkFetchAfterHubRender,
  WALLET_NETWORK_HUB_FETCH_DEBOUNCE_MS,
} from "./device-hub-network-tools-core.mjs";
import {
  isDeviceHubExpanded,
  walletNetworkVisibilityRefreshAllowed,
} from "./device-live-control-poll-scheduler.mjs";
import {
  orderEntriesVisibleFirst,
  profileIdsWithVisibleRows,
  visibleSummaryRowWindow,
} from "./device-hub-visible-rows-core.mjs";

const COLLAPSED_SAVED_ROW_PREVIEW_LIMIT = 3;
const LARGE_HUB_SUMMARY_ROW_INITIAL_LIMIT = 8;
const LARGE_HUB_SUMMARY_ROW_INCREMENT = 8;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function walletHaystack(entry) {
  return [entry.label, entry.handle, entry.manifesto_line, entry.profile_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function onWalletPage() {
  return document.body.classList.contains("page-wallet");
}

function hubIsExpanded() {
  return onWalletPage() || isDeviceHubExpanded(document.getElementById("device-hub"));
}

function shouldRenderFullSavedRows(summary = loadWalletSummary()) {
  if (onWalletPage()) return true;
  if (searchInput?.value?.trim()) return true;
  if (!hubIsExpanded()) return false;
  return !isLargeWallet(summary.count, getStewardEntitlementsPolicy());
}

function walletEntryForActionButton(btn) {
  const id = btn.getAttribute("data-id");
  const profileId = btn.getAttribute("data-profile-id");
  return (
    loadWallet().find(
      (entry) =>
        (id && entry.id === id) ||
        (profileId && entry.profile_id === profileId)
    ) ?? null
  );
}

function classifyObjectType(entry, qrScopeOverride = undefined) {
  const pilot = String(entry?.pilot_template || "").toLowerCase();
  const qrScope = qrScopeOverride ?? entry?.qr_scope ?? null;
  const taxonomy = objectTypeLabelFromContext({
    pilotTemplate: pilot,
    qrScope,
  });
  if (pilot === "status_plate" || pilot === "lost_item_relay") return taxonomy;

  const text = [
    entry?.label,
    entry?.manifesto_line,
    entry?.handle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(membership|member|club|cohort)/.test(text)) return { label: "Membership", tone: "membership" };
  if (/(event|pass|ticket|entry)/.test(text)) return { label: "Event pass", tone: "event-pass" };
  if (/(wearable|band|wrist|badge)/.test(text)) return { label: "Wearable", tone: "wearable" };
  if (/(demo|showcase|prototype|live demo)/.test(text)) return { label: "Live demo", tone: "live-demo" };
  if (/(tool|device|equipment|kit)/.test(text)) return { label: "Tool", tone: "tool" };
  if (/(civic|city|commons|public)/.test(text)) return { label: "Civic object", tone: "civic" };
  if (qrScope) return taxonomy;
  return { label: "Object", tone: "general" };
}

/** @type {{
 *   noticeMode: 'created-url' | 'keys-strip',
 *   fetchNetworkStatus: boolean,
 *   savedLabel: string,
 *   showLiveControlInbox: boolean,
 * }} */
let hubConfig = {
  noticeMode: "created-url",
  fetchNetworkStatus: true,
  savedLabel: "Cards",
  showLiveControlInbox: false,
};

/** Bumped when saved-card DOM is replaced or a new network fetch starts; stale fetches must not apply. */
let walletNetworkApplyGen = 0;
let expandedSummaryRowLimit = LARGE_HUB_SUMMARY_ROW_INITIAL_LIMIT;
let expandedSummaryWalletFingerprint = null;

/** Last chip status per profile from wallet poll (A1: re-apply must not rely on session cache alone). */
let lastWalletNetworkStatusMap = {};

/** @param {Record<string, string | undefined>} statusMap */
function rememberWalletNetworkStatusMap(statusMap = {}) {
  for (const [pid, status] of Object.entries(statusMap)) {
    if (!pid || status == null || status === "") continue;
    lastWalletNetworkStatusMap[pid] = String(status);
  }
}

function bumpWalletNetworkApplyGen() {
  if (walletNetworkFetchTimer != null) {
    clearTimeout(walletNetworkFetchTimer);
    walletNetworkFetchTimer = null;
  }
  walletNetworkApplyGen += 1;
  return walletNetworkApplyGen;
}

function restoreHubCardSearchable(li, profileId) {
  if (li.dataset.summaryRow === "1") {
    const row = loadWalletSummary().rows.find((entry) => entry.profile_id === profileId);
    if (row) {
      li.dataset.hubSearchable = walletHaystack(row);
      return;
    }
  }
  const entry = findWalletEntryByProfileId(profileId);
  if (entry) {
    li.dataset.hubSearchable = walletHaystack(entry);
    return;
  }
  const text = li.dataset.hubSearchable || "";
  li.dataset.hubSearchable = text
    .replace(/\s*revoked since last visit\s*/gi, " ")
    .replace(/\s*card disabled since last visit\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setRevokedSinceVisitAlertVisible(li, profileId, show) {
  const alertEl = li.querySelector(".hub-card-status-alert");
  li.classList.toggle("hub-card-item--revoked-since-visit", show);
  if (alertEl) {
    alertEl.hidden = !show;
    if (show) alertEl.removeAttribute("hidden");
    else alertEl.setAttribute("hidden", "");
  }
  if (show) {
    const base =
      li.dataset.hubSearchable ||
      (li.dataset.summaryRow === "1"
        ? walletHaystack(
            loadWalletSummary().rows.find((e) => e.profile_id === profileId) || {}
          )
        : walletHaystack(findWalletEntryByProfileId(profileId) || {}));
    if (!base.includes(CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET)) {
      li.dataset.hubSearchable = `${base} ${CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET}`.trim();
    }
  } else {
    restoreHubCardSearchable(li, profileId);
  }
}

let savedGroup;
let liveControlGroup;
let liveControlList;
let cardDisabledGroup;
let cardDisabledList;
let savedList;
let pinsGroup;
let pinsList;
let noticeGroup;
let activityGroup;
let activityList;
let searchInput;
let searchStatus;
let deviceHub;
let hubQueryRoot;
let emptyHint;
let shortcutsGroup;
let pinsEmptyEl;
let savedEmptyEl;
let activityEmptyEl;

function hubEl(id) {
  if (!id) return null;
  const inRoot = hubQueryRoot?.querySelector(`#${CSS.escape(id)}`);
  if (inRoot) return inRoot;
  return document.getElementById(id);
}

const HUB_SECTION_EMPTY = {
  pins: "Your pinned scans will show here.",
  saved: "Cards you save on this device will show here.",
  activity: "Nothing logged yet on this browser.",
};

function setHubListVisible(list, isEmpty) {
  if (!list) return;
  if (
    list.classList.contains("wallet-activity-list") ||
    list.classList.contains("device-hub-action-list")
  ) {
    list.removeAttribute("hidden");
    list.setAttribute("aria-hidden", isEmpty ? "true" : "false");
    list.classList.toggle("wallet-activity-list--empty", isEmpty);
    return;
  }
  list.hidden = isEmpty;
}

function setHubSectionEmpty(group, list, emptyEl, isEmpty, message) {
  if (!group) return;
  group.hidden = false;
  group.classList.toggle("device-hub-group--empty", isEmpty);
  setHubListVisible(list, isEmpty);
  if (emptyEl) {
    emptyEl.textContent = message;
    emptyEl.hidden = !isEmpty;
  }
}

function hubCardSubHtml(entry, lastUsed) {
  const savedLabel = formatSavedAt(entry.saved_at) || lastUsed;
  const keyPreview = walletEntryKeyPreview(entry);
  const handle = entry.handle ? `@${entry.handle}` : "";
  const idPreview = entry.profile_id ? `${entry.profile_id.slice(0, 10)}…` : "";
  const title = hubCardTitle(entry);
  const handleInTitle =
    handle && title.replace(/^@/, "").toLowerCase() === handle.replace(/^@/, "").toLowerCase();

  const detailParts = [];
  if (savedLabel) detailParts.push(`Last saved: ${escapeHtml(savedLabel)}`);
  if (keyPreview) detailParts.push(`Key: ${escapeHtml(keyPreview)}`);
  if (handle && !handleInTitle) detailParts.push(escapeHtml(handle));
  if (idPreview) detailParts.push(escapeHtml(idPreview));
  if (entry.profile_id && isDefaultVouchProfile(entry.profile_id)) {
    detailParts.push("Default for vouching");
  }

  if (detailParts.length === 0) {
    return "";
  }

  return `<details class="hub-card-details"><summary class="hub-card-details-summary">Details</summary><span class="hub-card-details-body">${detailParts.join("<br>")}</span></details>`;
}

function hubCardStatusMeta(profileId, statusOverride, scanKindOverride) {
  if (!hubConfig.fetchNetworkStatus) {
    return { label: "", tone: "muted" };
  }
  const status =
    statusOverride ?? getCachedNetworkStatus(profileId) ?? "checking";
  const scanKind = scanKindOverride ?? getCachedNetworkScanKind(profileId);
  return hubCardStatusLine({
    status,
    scanKind,
    checkedAt: getCachedNetworkSeenAt(profileId),
  });
}

function hubCardStatusHtml(profileId, statusOverride, scanKindOverride) {
  const status = hubCardStatusMeta(profileId, statusOverride, scanKindOverride);
  if (!status.label) return "";
  return `<span class="hub-card-status hub-card-status--${status.tone}" role="status"><span class="hub-card-status-dot" aria-hidden="true"></span><span class="hub-card-status-label">${escapeHtml(status.label)}</span></span>`;
}

function scanUrlForEntry(entry) {
  if (entry.scan_url) return entry.scan_url;
  const base = `${location.origin}/c/${encodeURIComponent(entry.profile_id)}`;
  const qrId = entry.qr_id ?? walletEntryQrId(entry);
  return qrId ? `${base}?q=${encodeURIComponent(qrId)}` : base;
}

const WALLET_PAGE_SHOW_ALL_KEY = "hc_wallet_page_show_all";

function walletPageShowsAllSavedRows() {
  try {
    return sessionStorage.getItem(WALLET_PAGE_SHOW_ALL_KEY) === "1";
  } catch {
    return false;
  }
}

function setWalletPageShowAllSavedRows() {
  try {
    sessionStorage.setItem(WALLET_PAGE_SHOW_ALL_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Saved-card rows for hub render: collapsed summary preview, or full rows with S10/S11 caps.
 * @returns {{
 *   entries: ReturnType<typeof listWalletDisplayEntries> | ReturnType<typeof loadWalletSummary>["rows"],
 *   hiddenCount: number,
 *   fullRows: boolean,
 *   allEntries: typeof entries,
 * }}
 */
function savedRowsForRender() {
  const fullRows = shouldRenderFullSavedRows();
  if (!fullRows) {
    const allEntries = loadWalletSummary().rows;
    const entries = allEntries.slice(0, COLLAPSED_SAVED_ROW_PREVIEW_LIMIT);
    return {
      entries,
      hiddenCount: Math.max(0, allEntries.length - entries.length),
      fullRows: false,
      allEntries,
    };
  }

  const all = listWalletDisplayEntries();
  const policy = getStewardEntitlementsPolicy();
  const visible = visibleHubCardProfileIds();
  if (onWalletPage()) {
    if (walletPageShowsAllSavedRows()) {
      return { entries: all, hiddenCount: 0, fullRows: true, allEntries: all };
    }
    const capped = selectWalletPageSavedRowEntries(all, visible, policy);
    return { ...capped, fullRows: true, allEntries: all };
  }
  const capped = selectHubSavedRowEntries(all, visible, policy);
  return { ...capped, fullRows: true, allEntries: all };
}

/**
 * @param {number} hiddenCount
 */
function appendHubSavedMoreRow(hiddenCount) {
  if (!savedList || hiddenCount <= 0) return;
  const isWalletPage = onWalletPage();
  const li = document.createElement("li");
  li.className = "hub-card-item hub-card-item--more";
  li.dataset.hubSearchable = "more saved cards wallet";
  if (isWalletPage) {
    li.innerHTML = `
    <div class="hub-card-head">
      <span class="list-content">
        <span class="list-title">${hiddenCount} more saved on this device</span>
        <span class="list-sub">Show every card on this page</span>
      </span>
    </div>
    <div class="hub-card-actions">
      <div class="hub-card-actions-primary">
        <button type="button" class="hub-card-action hub-wallet-show-all-saved">Show all saved cards</button>
      </div>
    </div>`;
    li.querySelector(".hub-wallet-show-all-saved")?.addEventListener("click", () => {
      setWalletPageShowAllSavedRows();
      renderSavedRows();
    });
  } else {
    li.innerHTML = `
    <div class="hub-card-head">
      <span class="list-content">
        <span class="list-title">${hiddenCount} more saved on this device</span>
        <span class="list-sub">Open My cards for the full list and controls</span>
      </span>
    </div>
    <div class="hub-card-actions">
      <div class="hub-card-actions-primary">
        <a class="hub-card-action" href="/wallet/">Open My cards</a>
      </div>
    </div>`;
  }
  savedList.appendChild(li);
}

/** @param {Record<string, unknown>} entry Full row or {@link walletEntryPublicView}. */
function entryHasSigningKeys(entry) {
  return Boolean(entry.owner_private_key_b58 || entry.has_signing_key);
}

function hubCardIconHtml(profileId) {
  const cached = getCachedVerification(profileId);
  const meta = humanTrustIconMeta({
    label: cached?.label,
    state: cached?.state,
  });
  return `<span class="list-icon ${meta.toneClass}" aria-hidden="true">${meta.svg}</span>`;
}

function liveControlPendingForEntry(entry) {
  return getLiveControlPending().find((p) => p.entry.profile_id === entry.profile_id) ?? null;
}

/** @param {import("./device-hub-controls-core.mjs").HubCardControl[]} controls */
function hubCardControlsHtml(entry, controls) {
  if (controls.length === 0) {
    return "";
  }
  const buttons = controls
    .map((c) => hubCardControlButtonHtml(entry, c))
    .join("");
  return `<div class="hub-card-controls" role="group" aria-label="Card actions">${buttons}</div>`;
}

/**
 * @param {import("./device-wallet.mjs").WalletEntry} entry
 * @param {import("./device-hub-controls-core.mjs").HubCardControl} control
 * @param {{ menu?: boolean }} [opts]
 */
function hubCardControlButtonHtml(entry, control, opts = {}) {
  if (opts.menu === true) {
    const stacked = control.menuHint ? " hub-card-menu-item--stacked" : "";
    const hint = control.menuHint
      ? `<span class="hub-card-menu-item-hint">${escapeHtml(control.menuHint)}</span>`
      : "";
    return `<button type="button" class="hub-card-menu-item hub-card-menu-item--${control.variant} hub-card-menu-steward hub-card-control--${control.id}${stacked}" data-id="${escapeHtml(entry.id)}" data-focus="${escapeHtml(control.focus)}"><span class="hub-card-menu-item-label">${escapeHtml(control.label)}</span>${hint}</button>`;
  }
  return `<button type="button" class="hub-card-control hub-card-control--${control.variant} hub-card-control--${control.id}" data-id="${escapeHtml(entry.id)}" data-focus="${escapeHtml(control.focus)}">${escapeHtml(control.label)}</button>`;
}

/**
 * @param {import("./device-wallet.mjs").WalletEntry} entry
 * @param {import("./device-hub-controls-core.mjs").HubCardControl[]} menuControls
 */
function hubCardMenuLifecycleHtml(entry, menuControls) {
  if (menuControls.length === 0) return "";
  const items = menuControls.map((c) => hubCardControlButtonHtml(entry, c, { menu: true })).join("");
  return `<p class="hub-card-menu-section-label" role="presentation">QR &amp; lifecycle</p>${items}`;
}

/**
 * @param {import("./device-wallet.mjs").WalletEntry} entry
 * @param {import("./device-hub-controls-core.mjs").HubCardControl[]} menuControls
 */
function hubCardMenuHtml(entry, menuControls) {
  const lifecycle = hubCardMenuLifecycleHtml(entry, menuControls);
  const lifecycleBlock = lifecycle
    ? `<div class="hub-card-menu-section" role="group" aria-label="QR and lifecycle">${lifecycle}</div><div class="hub-card-menu-divider" role="separator"></div>`
    : "";
  return `
        <details class="hub-card-menu">
          <summary class="hub-card-menu-btn" aria-label="More options">⋯</summary>
          <div class="hub-card-menu-panel">
            <button type="button" class="hub-card-menu-item hub-open-card" data-id="${escapeHtml(entry.id)}">Open card</button>
            <button type="button" class="hub-card-menu-item hub-relabel" data-id="${escapeHtml(entry.id)}">Relabel</button>
            ${lifecycleBlock}
            ${
              entry.owner_private_key_b58
                ? `<button type="button" class="hub-card-menu-item hub-default-vouch" data-id="${escapeHtml(entry.id)}">${
                    isDefaultVouchProfile(entry.profile_id)
                      ? "Default for vouching ✓"
                      : "Set as default for vouching"
                  }</button>`
                : ""
            }
            ${
              entry.owner_private_key_b58
                ? `<button type="button" class="hub-card-menu-item hub-sign-lock-pin" data-id="${escapeHtml(entry.id)}">${
                    getSignLock(entry.profile_id)?.mode === "pin"
                      ? "Change PIN before sign"
                      : "Require PIN before sign"
                  }</button>`
                : ""
            }
            ${
              entry.owner_private_key_b58 && isWebAuthnUnlockAvailable()
                ? `<button type="button" class="hub-card-menu-item hub-sign-lock-webauthn" data-id="${escapeHtml(entry.id)}">${
                    getSignLock(entry.profile_id)?.mode === "webauthn"
                      ? "Change device unlock before sign"
                      : "Require device unlock before sign"
                  }</button>`
                : ""
            }
            ${
              entry.owner_private_key_b58 && isSignLockEnabled(entry.profile_id)
                ? `<button type="button" class="hub-card-menu-item hub-sign-lock-clear" data-id="${escapeHtml(entry.id)}">Remove sign unlock requirement</button>`
                : ""
            }
            <button type="button" class="hub-card-menu-item hub-remove" data-id="${escapeHtml(entry.id)}">Remove from device</button>
          </div>
        </details>`;
}

function currentNetworkStatus(profileId, statusMap = {}) {
  if (statusMap[profileId] != null && statusMap[profileId] !== "") {
    return statusMap[profileId];
  }
  const truthChip = getWalletNetworkTruthChipStatus(profileId);
  if (truthChip != null && truthChip !== "") return truthChip;
  return getCachedNetworkStatus(profileId) ?? "checking";
}

function currentNetworkScanKind(profileId, scanKindMap = {}) {
  return scanKindMap[profileId] ?? getCachedNetworkScanKind(profileId) ?? null;
}

function applyNetworkChipsToDom(
  statusMap = {},
  alertStateMap = null,
  scanKindMap = {},
  resolverConfirmedMap = null,
  { allowBannerShow = false } = {}
) {
  if (!savedList) return;
  rememberWalletNetworkStatusMap(statusMap);
  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const pid = li.dataset.profileId;
    if (!pid) return;
    const statusEl = li.querySelector(".hub-card-status");
    if (statusEl) {
      const meta = hubCardStatusMeta(
        pid,
        currentNetworkStatus(pid, statusMap),
        currentNetworkScanKind(pid, scanKindMap)
      );
      statusEl.className = `hub-card-status hub-card-status--${meta.tone}`;
      const labelEl = statusEl.querySelector(".hub-card-status-label");
      if (labelEl) labelEl.textContent = meta.label;
    }
    const identityEl = li.querySelector(".hub-card-identity");
    if (identityEl) {
      const entry =
        li.dataset.summaryRow === "1"
          ? loadWalletSummary().rows.find((e) => e.profile_id === pid)
          : findWalletEntryByProfileId(pid);
      const objectType = classifyObjectType(entry ?? {}, getCachedNetworkQrScope(pid));
      const cached = getCachedVerification(pid);
      const identity = hubCardIdentityLine({
        objectTypeLabel: objectType.label,
        verificationLabel: cached?.label,
        verificationState: cached?.state,
        includeVerification: hubConfig.fetchNetworkStatus,
      });
      identityEl.className = `hub-card-identity hub-card-identity--${identity.verifyTone}`;
      identityEl.textContent = identity.text;
    }
    const iconEl = li.querySelector(".hub-card-head .list-icon");
    if (iconEl) {
      const cached = getCachedVerification(pid);
      const meta = humanTrustIconMeta({
        label: cached?.label,
        state: cached?.state,
      });
      iconEl.className = `list-icon ${meta.toneClass}`;
      iconEl.innerHTML = meta.svg;
    }
  });
  applyRevokedSinceVisitAlerts(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap, {
    allowShow: allowBannerShow,
  });
}

/**
 * @param {Record<string, string | undefined>} _statusMap
 * @param {Record<string, string> | null} alertStateMap
 * @param {Record<string, string | null>} scanKindMap
 * @param {Record<string, boolean> | null} resolverConfirmedMap
 * @param {{ allowShow?: boolean }} [options] A5: map-only re-apply may hide, never show.
 */
function applyRevokedSinceVisitAlerts(
  _statusMap = {},
  alertStateMap = null,
  scanKindMap = {},
  resolverConfirmedMap = null,
  { allowShow = false } = {}
) {
  if (!savedList || !hubConfig.fetchNetworkStatus) return;

  if (shouldSuppressCardDisabledSinceVisitAlerts()) {
    savedList.querySelectorAll(".hub-card-item").forEach((li) => {
      const pid = li.dataset.profileId;
      if (pid) setRevokedSinceVisitAlertVisible(li, pid, false);
    });
    return;
  }

  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const pid = li.dataset.profileId;
    if (!pid) return;
    // DH-1: never show since-visit alert from session cache before fetch resolves.
    if (alertStateMap == null || alertStateMap[pid] === undefined) {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    if (shouldSuppressCardDisabledSinceVisitForProfile(pid)) {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    const netStatus = String(currentNetworkStatus(pid, _statusMap) || "").toLowerCase();
    if (isSinceVisitBlockedChipStatus(netStatus)) {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    if (netStatus === "active") {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    const resolverConfirmed = resolverConfirmedMap?.[pid] === true;
    const scanKind = scanKindMap[pid] !== undefined ? scanKindMap[pid] : null;
    if (resolverConfirmed) {
      const alertNorm = normalizeBaselineState(alertStateMap[pid]);
      const kind = String(scanKind || "").toLowerCase();
      if (alertNorm !== CARD_REVOKED_ALERT_STATE || kind === "active") {
        setRevokedSinceVisitAlertVisible(li, pid, false);
        return;
      }
    }
    const show = cardDisabledSinceVisitVisible(
      alertStateMap[pid],
      getNetworkLastSeenBaseline(pid),
      scanKind,
      resolverConfirmed
    );
    const truthAlert = getLatestResolvedAlertState(pid);
    const truthKind = getLatestResolvedScanKind(pid);
    const mapsAgreeOnRevoked =
      String(scanKind || "").toLowerCase() === CARD_REVOKED_ALERT_STATE &&
      String(truthKind || "").toLowerCase() === CARD_REVOKED_ALERT_STATE &&
      normalizeBaselineState(truthAlert) === CARD_REVOKED_ALERT_STATE;
    if (show && allowShow && mapsAgreeOnRevoked) {
      setRevokedSinceVisitAlertVisible(li, pid, true);
    } else {
      setRevokedSinceVisitAlertVisible(li, pid, false);
    }
  });
}

function bindRevokedAlertHandlers() {
  if (!savedList) return;

  savedList.querySelectorAll(".hub-card-alert-dismiss").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const li = btn.closest(".hub-card-item");
      const pid = li?.dataset.profileId;
      if (!pid) return;
      recordNetworkSeen(pid, CARD_REVOKED_ALERT_STATE);
    });
  });
}

function acknowledgeNetworkSeenForEntry(entry) {
  if (!entry?.profile_id) return;
  recordNetworkSeen(
    entry.profile_id,
    getLatestResolvedAlertState(entry.profile_id) ?? "active"
  );
}

function reapplyRevokedSinceVisitFromLatestResolved() {
  if (!savedList || !hubConfig.fetchNetworkStatus) return;
  const maps = buildResolverConfirmedWalletPollMaps(
    savedList.dataset.walletRowsMode === "summary" ? loadWalletSummary().rows : undefined
  );
  if (!maps) {
    applyRevokedSinceVisitAlerts({}, null, {}, null, { allowShow: false });
    return;
  }
  applyRevokedSinceVisitAlerts(
    lastWalletNetworkStatusMap,
    maps.alertStateMap,
    maps.scanKindMap,
    maps.resolverConfirmedMap,
    { allowShow: false }
  );
}

const HUB_NETWORK_CHECKED_AT_SESSION_KEY = "hc_hub_network_checked_at";

function readPersistedNetworkCheckedAt() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const n = Number(sessionStorage.getItem(HUB_NETWORK_CHECKED_AT_SESSION_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {number} at
 */
function persistNetworkCheckedAt(at) {
  lastWalletNetworkFetchAt = at;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(HUB_NETWORK_CHECKED_AT_SESSION_KEY, String(at));
  } catch {
    /* ignore */
  }
}

let lastWalletNetworkFetchAt = readPersistedNetworkCheckedAt();
/** @type {ReturnType<typeof setTimeout> | null} */
let walletNetworkFetchTimer = null;
let walletNetworkRefreshCursor = 0;

export const HUB_NETWORK_CHECKED_EVENT = "hc-hub-network-checked";

export function getLastWalletNetworkCheckedAt() {
  return lastWalletNetworkFetchAt;
}

if (typeof window !== "undefined") {
  window.addEventListener(HUB_NETWORK_CHECKED_EVENT, (e) => {
    const at =
      e instanceof CustomEvent && e.detail && typeof e.detail === "object"
        ? /** @type {{ at?: number }} */ (e.detail).at
        : undefined;
    if (typeof at === "number" && Number.isFinite(at) && at > 0) {
      persistNetworkCheckedAt(at);
    }
  });
}

function applyCachedNetworkChipsOnly() {
  if (!savedList) return;
  const entries =
    savedList.dataset.walletRowsMode === "summary"
      ? loadWalletSummary().rows
      : listWalletDisplayEntries();
  if (entries.length === 0) return;
  applyNetworkChipsToDom(
    Object.fromEntries(
      entries.map((e) => [e.profile_id, getCachedNetworkStatus(e.profile_id) ?? "checking"])
    ),
    null,
    {},
    null,
    { allowBannerShow: false }
  );
}

/**
 * Profile IDs for saved-card rows visible in the hub list viewport (Phase 8c).
 * @returns {string[]}
 */
function visibleHubCardProfileIds() {
  if (!savedList) return [];
  const scrollRoot =
    savedList.closest(".device-hub-scroll") ||
    savedList.closest("#device-hub") ||
    savedList;
  const viewportRect = scrollRoot.getBoundingClientRect();
  const viewport = { top: viewportRect.top, bottom: viewportRect.bottom };
  const rowRects = [];
  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const profileId = li.dataset.profileId;
    if (!profileId) return;
    const rect = li.getBoundingClientRect();
    rowRects.push({ profileId, top: rect.top, bottom: rect.bottom });
  });
  return profileIdsWithVisibleRows(rowRects, viewport);
}

function scheduleWalletNetworkFetch() {
  if (walletNetworkFetchTimer != null) {
    clearTimeout(walletNetworkFetchTimer);
  }
  walletNetworkFetchTimer = window.setTimeout(() => {
    walletNetworkFetchTimer = null;
    void fetchAndApplyNetworkChips();
  }, WALLET_NETWORK_HUB_FETCH_DEBOUNCE_MS);
}

/**
 * @param {{ manual?: boolean }} [opts]
 */
async function fetchAndApplyNetworkChips(opts = {}) {
  if (!hubConfig.fetchNetworkStatus || !savedList) return;
  persistNetworkCheckedAt(Date.now());
  const stored = loadWallet();
  if (stored.length === 0) return;
  const manual = opts.manual === true;
  if (manual) {
    claimLiveControlPollLeader();
  } else if (shouldFollowerSkipAutoNetworkFetch()) {
    const { entries } = normalizeWalletQrIds(stored);
    applyNetworkChipsToDom(
      Object.fromEntries(
        entries.map((e) => [
          e.profile_id,
          getCachedNetworkStatus(e.profile_id) ?? "checking",
        ])
      ),
      null,
      {},
      null,
      { allowBannerShow: true }
    );
    syncHubInboxAlertGroups();
    notifyHubChanged();
    window.dispatchEvent(
      new CustomEvent(HUB_NETWORK_CHECKED_EVENT, {
        detail: { at: lastWalletNetworkFetchAt },
      })
    );
    return;
  } else {
    touchLiveControlPollLeader();
  }
  const { entries, changed: qrBackfill } = normalizeWalletQrIds(stored);
  if (qrBackfill) saveWallet(entries);
  const gen = bumpWalletNetworkApplyGen();
  applyNetworkChipsToDom(
    Object.fromEntries(
      entries.map((e) => [e.profile_id, getCachedNetworkStatus(e.profile_id) ?? "checking"])
    ),
    null,
    {},
    null,
    { allowBannerShow: false }
  );

  const staleEntries = listWalletEntriesNeedingNetworkFetch(entries);
  const visibleProfileIds = visibleHubCardProfileIds();
  const policy = getStewardEntitlementsPolicy();
  let entriesToFetch = entries;
  if (manual) {
    const manualPool = staleEntries.length > 0 ? staleEntries : entries;
    entriesToFetch = orderEntriesVisibleFirst(manualPool, visibleProfileIds);
  } else if (isLargeWallet(entries.length, policy)) {
    if (staleEntries.length === 0) {
      window.dispatchEvent(
        new CustomEvent(HUB_NETWORK_CHECKED_EVENT, {
          detail: { at: lastWalletNetworkFetchAt },
        })
      );
      return;
    }
    const session = getTabSession();
    const picked = selectNetworkRefreshEntries(
      entries,
      {
        walletSize: entries.length,
        staleEntries,
        activeProfileId:
          session && typeof session.profile_id === "string" ? session.profile_id : null,
        visibleProfileIds,
        cursor: walletNetworkRefreshCursor,
      },
      policy
    );
    walletNetworkRefreshCursor = picked.nextCursor;
    entriesToFetch = picked.entries;
  } else if (staleEntries.length > 0) {
    entriesToFetch = orderEntriesVisibleFirst(staleEntries, visibleProfileIds);
  } else {
    return;
  }

  await refreshWalletNetworkStatuses(
    entriesToFetch,
    ({
      statusMap,
      alertStateMap,
      scanKindMap,
      resolverConfirmedMap,
    }) => {
      if (gen !== walletNetworkApplyGen) return;
      applyNetworkChipsToDom(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap, {
        allowBannerShow: true,
      });
      syncLastSeenFromNetworkMap(alertStateMap);
      const stored = loadWallet();
      let changed = false;
      const next = stored.map((e) => {
        const net = statusMap[e.profile_id];
        const scanKind = scanKindMap[e.profile_id] ?? null;
        const hadScanKind = Object.prototype.hasOwnProperty.call(e, "scan_kind");
        const currentScanKind = hadScanKind ? e.scan_kind ?? null : null;
        if (net && (e.status !== net || currentScanKind !== scanKind)) {
          changed = true;
          return { ...e, status: net, scan_kind: scanKind };
        }
        return e;
      });
      if (changed) saveWallet(next);
      syncHubInboxAlertGroups();
      notifyHubChanged();
      window.dispatchEvent(
        new CustomEvent(HUB_NETWORK_CHECKED_EVENT, {
          detail: { at: lastWalletNetworkFetchAt },
        })
      );
      broadcastNetworkSnapshotIfEligible({
        manual,
        entries: entriesToFetch,
        statusMap,
        scanKindMap,
        resolverConfirmedMap,
        alertStateMap,
      });
    },
    {
      generation: gen,
      isCurrentGeneration: () => gen === walletNetworkApplyGen,
      maxParallel: walletNetworkMaxParallel(entries.length, { manual }, policy),
    }
  );
}

/** Manual Shortcuts action: one leader check, then broadcast to open tabs. @see docs/DEVICE_TAB_RESOLVER_SYNC.md § Manual refresh */
export async function refreshResolverChecksFromHub() {
  if (hubConfig.fetchNetworkStatus) {
    if (getWalletCount() > 0) {
      await fetchAndApplyNetworkChips({ manual: true });
    }
  }
  if (hubConfig.showLiveControlInbox) {
    await checkLiveProofNow();
  }
}

function syncHubInboxAlertGroups() {
  renderHubKeysCustodyPanel();
  renderHubInboxAlerts({
    noticeGroup,
    liveControlGroup,
    liveControlList,
    cardDisabledGroup,
    cardDisabledList,
    noticeMode: hubConfig.noticeMode,
    showLiveControlInbox: hubConfig.showLiveControlInbox,
  });
}

/**
 * Refresh only inbox-derived hub alert groups.
 * Called by the chrome refresh coordinator to avoid re-rendering the full hub.
 */
export function refreshHubInboxAlertsFromChrome() {
  syncHubInboxAlertGroups();
  refreshEmptyHint();
}

function renderActivityRows() {
  const entries = loadActivity().slice(0, HUB_RECENT_DISPLAY_LIMIT);
  if (!activityList || !activityGroup) return;

  activityList.innerHTML = "";
  if (entries.length === 0) {
    setHubSectionEmpty(
      activityGroup,
      activityList,
      activityEmptyEl,
      true,
      HUB_SECTION_EMPTY.activity
    );
    return;
  }

  setHubSectionEmpty(activityGroup, activityList, activityEmptyEl, false, "");
  const walletActivity = hubQueryRoot?.id === "wallet-page";

  for (const entry of entries) {
    const li = document.createElement("li");
    const when = formatActivityTime(entry.at);
    const sub = when
      ? `${activityTypeLabel(entry.type)} · ${when}`
      : activityTypeLabel(entry.type);
    li.dataset.hubSearchable = activityHaystack(entry);

    if (walletActivity) {
      li.className = "wallet-activity-item";
      li.innerHTML = `
        <button type="button" class="wallet-activity-btn">
          <span class="wallet-activity-label">${escapeHtml(entry.label)}</span>
          <span class="wallet-activity-meta">${escapeHtml(sub)}</span>
        </button>`;
      li.querySelector(".wallet-activity-btn")?.addEventListener("click", () => {
        openActivityNow(entry);
      });
    } else {
      li.className = "wallet-activity-item device-hub-action-item";
      li.innerHTML = `
        <button type="button" class="wallet-activity-btn device-hub-action-btn">
          <span class="wallet-activity-label device-hub-action-label">${escapeHtml(entry.label)}</span>
          <span class="wallet-activity-meta device-hub-action-meta">${escapeHtml(sub)}</span>
        </button>`;
      li.querySelector(".device-hub-action-btn")?.addEventListener("click", () => {
        openActivityNow(entry);
      });
    }
    activityList.appendChild(li);
  }

  if (!walletActivity && activityList) {
    activityList.classList.add("wallet-activity-list", "device-hub-action-list");
    activityList.removeAttribute("hidden");
    activityList.setAttribute("aria-hidden", "false");
    activityList.classList.remove("wallet-activity-list--empty");
  }
}

/**
 * @param {{ initialChipChecking?: boolean }} [opts] Use checking chips until the next poll (avoids stale cache flash after wallet edits).
 */
function renderSavedRows(opts = {}) {
  const initialChipChecking = opts.initialChipChecking === true;
  const summary = loadWalletSummary();
  if (summary.walletFingerprint !== expandedSummaryWalletFingerprint) {
    expandedSummaryWalletFingerprint = summary.walletFingerprint;
    expandedSummaryRowLimit = LARGE_HUB_SUMMARY_ROW_INITIAL_LIMIT;
  }
  const expandedRows = hubIsExpanded();
  const fullRows = shouldRenderFullSavedRows(summary);
  let entries;
  let hiddenCount = 0;
  let allEntriesCount = 0;
  let previewRows = false;
  let virtualizedSummaryRows = false;
  let windowed = null;
  let allEntries = summary.rows;

  if (fullRows) {
    const rendered = savedRowsForRender();
    entries = rendered.entries;
    hiddenCount = rendered.hiddenCount;
    allEntries = rendered.allEntries;
    allEntriesCount = allEntries.length;
  } else {
    allEntriesCount = allEntries.length;
    previewRows = !expandedRows;
    virtualizedSummaryRows =
      expandedRows && isLargeWallet(summary.count, getStewardEntitlementsPolicy());
    windowed = virtualizedSummaryRows
      ? visibleSummaryRowWindow(allEntries, { limit: expandedSummaryRowLimit })
      : null;
    entries = previewRows
      ? allEntries.slice(0, COLLAPSED_SAVED_ROW_PREVIEW_LIMIT)
      : windowed?.rows ?? allEntries;
  }
  if (!savedList || !savedGroup) return;
  savedList.dataset.walletRowsMode = fullRows ? "full" : "summary";

  const labelEl =
    savedGroup.querySelector(".device-hub-subgroup-label") ||
    savedGroup.querySelector(".device-hub-group-label");
  if (labelEl) labelEl.textContent = hubConfig.savedLabel;

  savedList.innerHTML = "";
  if (entries.length === 0) {
    setHubSectionEmpty(
      savedGroup,
      savedList,
      savedEmptyEl,
      true,
      HUB_SECTION_EMPTY.saved
    );
    return;
  }

  setHubSectionEmpty(savedGroup, savedList, savedEmptyEl, false, "");
  for (const entry of entries) {
    const li = document.createElement("li");
    const objectType = classifyObjectType(
      entry,
      hubConfig.fetchNetworkStatus ? getCachedNetworkQrScope(entry.profile_id) : undefined
    );
    const pilotTemplate =
      entry.pilot_template ||
      (entry.manifesto_line ? inferPilotTemplate(String(entry.manifesto_line)) : "general");
    const cardControls = fullRows
      ? applyHubControlPlainLabels(
          buildHubCardControls({
            hasKeys: entryHasSigningKeys(entry),
            pendingLiveProof: !!liveControlPendingForEntry(entry),
            scanKind: hubConfig.fetchNetworkStatus
              ? getCachedNetworkScanKind(entry.profile_id)
              : null,
          }),
          pilotTemplate
        )
      : [];
    const { inline: inlineControls, menu: menuControls } =
      partitionHubCardControls(cardControls);
    li.className = `hub-card-item hub-card-item--${objectType.tone}${
      inlineControls.length > 0 ? " hub-card-item--has-controls" : ""
    }${fullRows ? "" : " hub-card-item--summary"}`;
    li.dataset.hubSearchable = walletHaystack(entry);
    li.dataset.profileId = entry.profile_id;
    if (!fullRows) li.dataset.summaryRow = "1";
    const lastUsed = lastActivityForEntry(entry);
    const scan = scanUrlForEntry(entry);
    const cachedVerification = hubConfig.fetchNetworkStatus
      ? getCachedVerification(entry.profile_id)
      : null;
    const identity = hubCardIdentityLine({
      objectTypeLabel: objectType.label,
      verificationLabel: cachedVerification?.label,
      verificationState: cachedVerification?.state,
      includeVerification: hubConfig.fetchNetworkStatus,
    });
    const statusHtml = hubCardStatusHtml(
      entry.profile_id,
      initialChipChecking ? "checking" : getCachedNetworkStatus(entry.profile_id) ?? "checking",
      initialChipChecking ? null : getCachedNetworkScanKind(entry.profile_id)
    );
    const cardIcon = hubConfig.fetchNetworkStatus
      ? hubCardIconHtml(entry.profile_id)
      : `<span class="list-icon list-icon-tone-trust" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>`;
    const revokedAlert = hubConfig.fetchNetworkStatus
      ? `<div class="hc-emphasis-card hc-emphasis-card--warn hub-card-status-alert" data-hub-searchable="${escapeHtml(CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET)} network" hidden role="status">
          <div class="hc-emphasis-card__main">
            <span class="hc-emphasis-card__dot hc-emphasis-card__dot--warn" aria-hidden="true"></span>
            <div class="hc-emphasis-card__copy">
              <p class="hc-emphasis-card__eyebrow">Card status</p>
              <p class="hc-emphasis-card__detail hub-card-status-alert-text">${escapeHtml(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT)}</p>
            </div>
          </div>
          <div class="hc-emphasis-card__actions hub-card-status-alert-actions">
            <button type="button" class="hc-emphasis-card__cta hc-emphasis-card__cta--secondary hub-card-alert-dismiss">Got it</button>
            <a class="hc-emphasis-card__cta hc-emphasis-card__cta--secondary hub-card-alert-view-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">View scan</a>
          </div>
        </div>`
      : "";

    const menuBlock = fullRows ? hubCardMenuHtml(entry, menuControls) : "";
    const controlsHtml = fullRows ? hubCardControlsHtml(entry, inlineControls) : "";
    const actionData = `data-id="${escapeHtml(entry.id ?? "")}" data-profile-id="${escapeHtml(entry.profile_id ?? "")}"`;
    const actionsHtml = fullRows || expandedRows
      ? `<div class="hub-card-actions">
        <div class="hub-card-actions-primary">
          <button type="button" class="hub-card-action hub-use-keys" ${actionData} title="Load signing keys into this tab, then open your card page">Open controls</button>
          <a class="hub-card-action hub-open-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">Open scan</a>
        </div>
      </div>`
      : "";

    li.innerHTML = `
      <div class="hub-card-head">
        ${cardIcon}
        <span class="list-content">
          <span class="list-title">${escapeHtml(hubCardTitle(entry))}</span>
          <span class="hub-card-identity hub-card-identity--${identity.verifyTone}">${escapeHtml(identity.text)}</span>
          ${statusHtml}
          ${fullRows ? hubCardSubHtml(entry, lastUsed) : ""}
        </span>
        <div class="hub-card-head-meta">
          ${menuBlock}
        </div>
      </div>
      ${revokedAlert}
      ${controlsHtml}
      ${actionsHtml}`;
    savedList.appendChild(li);
  }

  if (previewRows && allEntries.length > entries.length) {
    const li = document.createElement("li");
    li.className = "hub-card-item hub-card-item--general hub-card-item--summary hub-card-item--more";
    li.dataset.hubSearchable = "more saved cards";
    li.innerHTML = `
      <div class="hub-card-head">
        <span class="list-icon list-icon-tone-trust" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
        <span class="list-content">
          <span class="list-title">${allEntriesCount - entries.length} more saved on this device</span>
          <span class="hub-card-identity hub-card-identity--muted">Open the hub to load full rows</span>
        </span>
      </div>`;
    savedList.appendChild(li);
  }

  if (virtualizedSummaryRows && windowed && windowed.remaining > 0) {
    const li = document.createElement("li");
    li.className = "hub-card-item hub-card-item--general hub-card-item--summary hub-card-item--more";
    li.dataset.hubSearchable = "more saved cards";
    const nextCount = Math.min(LARGE_HUB_SUMMARY_ROW_INCREMENT, windowed.remaining);
    li.innerHTML = `
      <div class="hub-card-head">
        <span class="list-icon list-icon-tone-trust" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
        <span class="list-content">
          <span class="list-title">${windowed.remaining} more saved on this device</span>
          <span class="hub-card-identity hub-card-identity--muted">Summary rows stay lightweight until you open controls</span>
        </span>
        <div class="hub-card-head-meta">
          <button type="button" class="hub-card-action hub-show-more-summary">Show ${nextCount} more</button>
        </div>
      </div>`;
    savedList.appendChild(li);
  }

  if (fullRows) {
    appendHubSavedMoreRow(hiddenCount);
  }

  bindRevokedAlertHandlers();

  if (previewRows) {
    syncHubInboxAlertGroups();
    return;
  }

  savedList.querySelector(".hub-show-more-summary")?.addEventListener("click", () => {
    expandedSummaryRowLimit += LARGE_HUB_SUMMARY_ROW_INCREMENT;
    renderSavedRows();
    applySearchFilter();
    refreshEmptyHint();
  });

  savedList.querySelectorAll(".hub-card-control, .hub-card-menu-steward").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const focus = btn.getAttribute("data-focus");
      const entry = findWalletEntryById(id);
      if (!entry || !focus) return;
      acknowledgeNetworkSeenForEntry(entry);
      if (focus === "live-proof") {
        const pending = liveControlPendingForEntry(entry);
        if (pending) {
          openLiveControlProof(pending);
          return;
        }
      }
      if (!entryHasSigningKeys(entry)) {
        window.alert("This saved card has no signing keys on this device.");
        return;
      }
      let returnUrl = null;
      try {
        returnUrl = sessionStorage.getItem("hc_vouch_return_url");
      } catch {
        /* ignore */
      }
      openCardControlPage(entry, focus, { returnUrl });
    });
  });

  savedList.querySelectorAll(".hub-use-keys").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = fullRows
        ? findWalletEntryById(btn.getAttribute("data-id"))
        : walletEntryForActionButton(btn);
      if (!entry) return;
      acknowledgeNetworkSeenForEntry(entry);
      let returnUrl = null;
      try {
        returnUrl = sessionStorage.getItem("hc_vouch_return_url");
      } catch {
        /* ignore */
      }
      openCardNowPage(entry, { returnUrl });
    });
  });

  savedList.querySelectorAll(".hub-open-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry) return;
      acknowledgeNetworkSeenForEntry(entry);
      let returnUrl = null;
      try {
        returnUrl = sessionStorage.getItem("hc_vouch_return_url");
      } catch {
        /* ignore */
      }
      openCardNowPage(entry, { returnUrl });
    });
  });

  savedList.querySelectorAll(".hub-sign-lock-pin").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry?.profile_id) return;
      const first = window.prompt("Choose a 4–32 character PIN for signing on this device:");
      if (first == null) return;
      const second = window.prompt("Confirm PIN:");
      if (second == null) return;
      if (first !== second) {
        window.alert("PIN entries did not match.");
        return;
      }
      const result = await setPinSignLock(entry.profile_id, first);
      if (!result.ok) {
        window.alert(result.error || "Could not save PIN lock.");
        return;
      }
      logDeviceActivity("sign_lock_pin_set", entry.label, {
        profile_id: entry.profile_id,
      });
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-sign-lock-webauthn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry?.profile_id) return;
      const result = await setWebAuthnSignLock(
        entry.profile_id,
        entry.label || entry.handle
      );
      if (!result.ok) {
        window.alert(result.error || "Could not enable device unlock.");
        return;
      }
      logDeviceActivity("sign_lock_webauthn_set", entry.label, {
        profile_id: entry.profile_id,
      });
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-sign-lock-clear").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry?.profile_id) return;
      if (!window.confirm("Remove PIN/device unlock requirement for this card?")) return;
      clearSignLock(entry.profile_id);
      logDeviceActivity("sign_lock_cleared", entry.label, {
        profile_id: entry.profile_id,
      });
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-default-vouch").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry?.profile_id) return;

      if (isDefaultVouchProfile(entry.profile_id)) {
        setDefaultVouchProfile(null);
        logDeviceActivity("default_vouch_clear", entry.label, {
          profile_id: entry.profile_id,
        });
        renderSavedRows();
        notifyHubChanged();
        return;
      }

      if (!entryHasSigningKeys(entry)) {
        window.alert("This saved card has no signing keys on this device.");
        return;
      }

      let state = getCachedVerification(entry.profile_id)?.state ?? null;
      if (!isEligibleVoucherState(state)) {
        try {
          const res = await fetch(
            getCardStatusUrl(String(entry.profile_id), walletEntryQrId(entry)),
            { cache: "no-store" }
          );
          if (res.ok) {
            const body = await res.json();
            state = body?.scan?.verification?.state ?? null;
          }
        } catch {
          /* ignore */
        }
      }

      if (!isEligibleVoucherState(state)) {
        window.alert(
          "Only Steward or Vouched Human cards can be set as default for vouching."
        );
        return;
      }

      setDefaultVouchProfile(entry.profile_id);
      logDeviceActivity("default_vouch_set", entry.label, {
        profile_id: entry.profile_id,
      });
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-relabel").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!entry) return;
      const next = window.prompt("Label for this card", entry.label);
      if (next == null || !next.trim()) return;
      const entries = loadWallet();
      const idx = entries.findIndex((e) => e.id === id);
      if (idx < 0) return;
      entries[idx] = { ...entries[idx], label: next.trim() };
      saveWallet(entries);
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = findWalletEntryById(id);
      if (!window.confirm("Remove this card from this device? Keys stay in any other tab until you close it.")) {
        return;
      }
      if (entry?.profile_id) {
        markProfileRemovedFromDevice(entry.profile_id);
        purgePresenceForProfile(entry.profile_id);
        offerClearOtherTabKeysOnRemove(entry.profile_id);
        clearSignLock(entry.profile_id);
        clearWalletNetworkTruthForProfile(entry.profile_id);
        logDeviceActivity("remove_card", entry.label, {
          profile_id: entry.profile_id,
          qr_id: entry.qr_id ?? null,
        });
      }
      bumpWalletNetworkApplyGen();
      saveWallet(loadWallet().filter((e) => e.id !== id));
      const remaining = loadWallet();
      renderSavedRows({ initialChipChecking: remaining.length > 0 });
      if (remaining.length === 0) {
        syncHubInboxAlertGroups();
      }
      applySearchFilter();
      notifyHubChanged();
    });
  });

  const hubEl = document.getElementById("device-hub");
  const hubExpanded = isDeviceHubExpanded(hubEl);
  if (hubExpanded) {
    refreshStewardEntitlementsOnHubContext();
  }
  const onWalletPage = document.body.classList.contains("page-wallet");
  if (
    shouldScheduleWalletNetworkFetchAfterHubRender({
      fetchNetworkStatus: hubConfig.fetchNetworkStatus,
      onWalletPage,
      hubExpanded,
    })
  ) {
    scheduleWalletNetworkFetch();
  } else {
    applyCachedNetworkChipsOnly();
    syncHubInboxAlertGroups();
  }
}

function renderPinRows() {
  const pins = loadPins();
  if (!pinsList || !pinsGroup) return;

  pinsList.innerHTML = "";
  if (pins.length === 0) {
    setHubSectionEmpty(pinsGroup, pinsList, pinsEmptyEl, true, HUB_SECTION_EMPTY.pins);
    return;
  }

  setHubSectionEmpty(pinsGroup, pinsList, pinsEmptyEl, false, "");
  for (const pin of pins) {
    const li = document.createElement("li");
    li.className = "list-row list-action device-pin-row";
    li.dataset.hubSearchable = pinHaystack(pin);
    const sub = pin.qr_id
      ? `${pin.profile_id.slice(0, 10)}… · opens scan`
      : `${pin.profile_id.slice(0, 14)}… · card scan`;
    li.innerHTML = `
      <a href="${escapeHtml(pin.scan_url)}" target="_blank" rel="noopener noreferrer">
        <span class="list-icon list-icon-tone-gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(pin.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron list-chevron-external" aria-hidden="true">↗</span>
      </a>`;
    pinsList.appendChild(li);
  }
}

function refreshEmptyHint() {
  if (!emptyHint) return;
  const hasData =
    getWalletCount() > 0 ||
    loadPins().length > 0 ||
    notificationCount() > 0 ||
    loadActivity().slice(0, HUB_RECENT_DISPLAY_LIMIT).length > 0;
  emptyHint.hidden = hasData;
}

function notifyHubChanged() {
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

function applySearchFilter() {
  const q = searchInput?.value ?? "";
  const { matchCount } = applyDeviceHubSearch(deviceHub, q);
  if (!q.trim()) {
    const items = getInboxItems();
    if (hubConfig.showLiveControlInbox && liveControlGroup) {
      liveControlGroup.hidden = !inboxItemsIncludeKind(items, "live_proof");
    }
    if (cardDisabledGroup) {
      cardDisabledGroup.hidden = !inboxItemsIncludeKind(items, "card_disabled_since_visit");
    }
  }
  refreshEmptyHint();

  if (searchStatus) {
    const trimmed = q.trim();
    if (!trimmed) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
    } else {
      searchStatus.hidden = false;
      searchStatus.textContent =
        matchCount === 0
          ? "No matches on this device."
          : `${matchCount} match${matchCount === 1 ? "" : "es"} on this device`;
    }
  }
}

function resolveHubQueryRoot(config) {
  if (config?.hubRoot) {
    if (typeof config.hubRoot === "string") {
      return document.querySelector(config.hubRoot);
    }
    if (config.hubRoot instanceof HTMLElement) {
      return config.hubRoot;
    }
  }
  return (
    document.getElementById("wallet-page") ||
    document.getElementById("device-hub") ||
    document
  );
}

function bindDom() {
  deviceHub =
    hubQueryRoot?.id === "wallet-page"
      ? hubQueryRoot
      : hubEl("device-hub") || hubQueryRoot;
  savedGroup = hubEl("device-hub-saved-group");
  savedList = hubEl("device-hub-wallet-list");
  pinsGroup = hubEl("device-hub-pins-group");
  pinsList = hubEl("device-hub-pins-list");
  noticeGroup = hubEl("device-hub-notice-group");
  liveControlGroup = hubEl("device-hub-live-control-group");
  liveControlList = hubEl("device-hub-live-control-list");
  cardDisabledGroup = hubEl("device-hub-card-disabled-group");
  cardDisabledList = hubEl("device-hub-card-disabled-list");
  activityGroup = hubEl("device-hub-activity-group");
  activityList = hubEl("device-hub-activity-list");
  searchInput = hubEl("device-hub-search");
  searchStatus = hubEl("device-hub-search-status");
  emptyHint = hubEl("device-hub-empty-hint");
  shortcutsGroup = hubEl("device-hub-shortcuts-group");
  pinsEmptyEl = hubEl("device-hub-pins-empty");
  savedEmptyEl = hubEl("device-hub-saved-empty");
  activityEmptyEl = hubEl("device-hub-activity-empty");
}

export function refreshDeviceHub() {
  syncHubInboxAlertGroups();
  syncBrowserNotifPrompts();
  renderActivityRows();
  renderSavedRows();
  renderPinRows();
  applySearchFilter();
  refreshEmptyHint();
}

export function focusHubSearch() {
  searchInput?.focus({ preventScroll: true });
  deviceHub?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * @param {{
 *   noticeMode?: 'created-url' | 'keys-strip',
 *   fetchNetworkStatus?: boolean,
 *   savedLabel?: string,
 *   showShortcuts?: boolean,
 *   showImport?: boolean,
 *   showActivity?: boolean,
 *   showEmptyHint?: boolean,
 *   showLiveControlInbox?: boolean,
 *   hubRoot?: string | HTMLElement,
 * }} [config]
 */
export function initDeviceHub(config = {}) {
  hubQueryRoot = resolveHubQueryRoot(config);
  bindDom();
  hubConfig = {
    noticeMode: config.noticeMode ?? "created-url",
    fetchNetworkStatus: config.fetchNetworkStatus !== false,
    savedLabel: config.savedLabel ?? "Cards",
    showLiveControlInbox: config.showLiveControlInbox === true,
  };

  if (liveControlGroup) {
    liveControlGroup.hidden = !hubConfig.showLiveControlInbox;
  }

  if (shortcutsGroup) shortcutsGroup.hidden = config.showShortcuts === false;
  if (activityGroup && config.showActivity === false) activityGroup.hidden = true;
  const importGroup =
    hubQueryRoot?.querySelector('[data-hub-group="import"]') ||
    document.querySelector('[data-hub-group="import"]');
  if (importGroup) importGroup.hidden = config.showImport === false;
  if (emptyHint && config.showEmptyHint === false) emptyHint.hidden = true;

  initHubBackupImport(hubEl("hub-import-form"), hubEl("hub-import-status"));
  mountThemeToggles();
  mountHubBuildStamp(hubQueryRoot ?? document);

  refreshDeviceHub();
  notifyHubChanged();
  initStewardEntitlementsHubHook();

  if (hubConfig.fetchNetworkStatus || hubConfig.showLiveControlInbox) {
    mountHubNetworkTools({
      hubRoot: hubQueryRoot ?? document,
      showNetwork: hubConfig.fetchNetworkStatus,
      showLiveProof: hubConfig.showLiveControlInbox,
      getNetworkCheckedAt: getLastWalletNetworkCheckedAt,
      getLiveProofCheckedAt: getLastLiveProofCheckAt,
      getAutoPollBudgetPaused: () => isLiveControlAutoPollBudgetPaused(),
      getStewardQuotaPaused: () => isStewardServerQuotaPaused(),
      getLargeWalletHint: () =>
        walletScaleHint(getWalletCount(), getStewardEntitlementsPolicy()),
      getHostedTierLine: () =>
        hostedTierHubIndicatorLine(getStewardEntitlementsPolicy()),
      onCheckNetwork: () => fetchAndApplyNetworkChips({ manual: true }),
      onCheckLiveProof: () => checkLiveProofNow(),
      onWatchChange: () => applyLiveControlWatchPreference(),
    });
  }

  if (hubConfig.showLiveControlInbox) {
    enableLiveControlInboxPolling();
    applyLiveControlWatchPreference();
    window.addEventListener("hc-live-control-inbox-changed", () => {
      syncHubInboxAlertGroups();
      syncBrowserNotifPrompts();
      applySearchFilter();
      refreshEmptyHint();
      notifyHubChanged();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", applySearchFilter);
    searchInput.addEventListener("search", applySearchFilter);
    searchInput.addEventListener("change", applySearchFilter);
  }

  window.addEventListener("storage", (e) => {
    if (
      e.key === "hc_wallet" ||
      e.key === "hc_device_pins" ||
      e.key === "hc_created" ||
      e.key === "hc_device_activity"
    ) {
      refreshDeviceHub();
      notifyHubChanged();
      if (hubConfig.showLiveControlInbox && isLiveControlInboxPollingActive()) {
        void refreshLiveControlInbox();
      }
    }
  });

  window.addEventListener("hc-device-activity-changed", () => {
    renderActivityRows();
    renderSavedRows();
    applySearchFilter();
    refreshEmptyHint();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      snapshotNetworkSeenOnExit();
      return;
    }
    if (document.visibilityState === "visible") {
      const hubEl = document.getElementById("device-hub");
      const hubCollapsed = hubEl?.classList.contains("device-hub-collapsed") ?? false;
      const walletPage = onWalletPage();
      const hasWallet = getWalletCount() > 0;
      if (
        hasWallet &&
        (walletPage || !hubCollapsed) &&
        walletNetworkVisibilityRefreshAllowed(lastWalletNetworkFetchAt)
      ) {
        void fetchAndApplyNetworkChips();
      }
    }
  });

  window.addEventListener(LIVE_CONTROL_POLL_SCOPE_CHANGED, () => {
    const hubEl = document.getElementById("device-hub");
    const walletPage = onWalletPage();
    const expanded = walletPage || isDeviceHubExpanded(hubEl);
    if (expanded && savedList?.dataset.walletRowsMode === "summary") {
      renderSavedRows();
      applySearchFilter();
      refreshEmptyHint();
    }
    if (!hubConfig.fetchNetworkStatus) return;
    if (expanded) {
      void fetchAndApplyNetworkChips();
    }
  });

  window.addEventListener("pagehide", () => snapshotNetworkSeenOnExit());

  window.addEventListener("hc-wallet-network-baseline-changed", () => {
    reapplyRevokedSinceVisitFromLatestResolved();
    syncHubInboxAlertGroups();
    notifyHubChanged();
  });

  window.addEventListener("hc-resolver-health-changed", () => {
    reapplyRevokedSinceVisitFromLatestResolved();
    syncHubInboxAlertGroups();
    notifyHubChanged();
  });

  // A3/A5: chip + row banner apply together in fetchAndApplyNetworkChips onDone only.
  // Do not apply banners here (NETWORK_REFRESHED fires before onDone; caused checking + banner split-brain).
  window.addEventListener(NETWORK_REFRESHED, () => {
    syncHubInboxAlertGroups();
    refreshEmptyHint();
    notifyHubChanged();
  });

  // Phase 2: device-chrome-refresh owns cross-tab refresh scheduling.
}

window.addEventListener("hc-focus-hub-search", () => focusHubSearch());
