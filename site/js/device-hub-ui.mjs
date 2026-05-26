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
import { syncBrowserNotifPrompts } from "./device-browser-notifications.mjs";
import { renderHubInboxAlerts, inboxItemsIncludeKind } from "./device-hub-inbox-alerts.mjs";
import { getInboxItems, notificationCount } from "./device-inbox.mjs";
import {
  buildHubCardControls,
  partitionHubCardControls,
} from "./device-hub-controls-core.mjs";
import {
  activateWalletEntry,
  getTabSession,
  openActivityNow,
  openCardControlPage,
  openCardNowPage,
} from "./device-keys.mjs";
import { loadPins, pinHaystack } from "./device-pins.mjs";
import {
  loadWallet,
  normalizeWalletQrIds,
  saveWallet,
  formatSavedAt,
  walletEntryKeyPreview,
  walletEntryQrId,
} from "./device-wallet.mjs";
import {
  getCachedNetworkSeenAt,
  getCachedNetworkScanKind,
  getCachedNetworkStatus,
  getCachedVerification,
  getLatestResolvedAlertState,
  getLatestResolvedScanKind,
  getNetworkLastSeenBaseline,
  hasLatestResolverNetworkPoll,
  isResolverConfirmedProfile,
  CARD_REVOKED_ALERT_STATE,
  recordNetworkSeen,
  refreshWalletNetworkStatuses,
  snapshotNetworkSeenOnExit,
  syncLastSeenFromNetworkMap,
  NETWORK_REFRESHED,
} from "./device-wallet-network.mjs";
import { DEVICE_OS_REFRESHED } from "./device-os-coordinator.mjs";
import { getCardStatusUrl } from "./hc-sign.mjs";
import {
  hubCardIdentityLine,
  hubCardStatusLine,
  hubCardTitle,
} from "./device-hub-card-row-core.mjs";
import { humanTrustIconMeta, isEligibleVoucherState } from "./human-trust-ui.mjs";
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
import {
  getLiveControlPending,
  openLiveControlProof,
  refreshLiveControlInbox,
  startLiveControlInboxPolling,
} from "./device-live-control-inbox.mjs";

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

function classifyObjectType(entry) {
  const pilot = String(entry?.pilot_template || "").toLowerCase();
  if (pilot === "status_plate") return { label: "Status plate", tone: "status-plate" };
  if (pilot === "lost_item_relay") return { label: "Lost item", tone: "lost-item" };

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

function bumpWalletNetworkApplyGen() {
  walletNetworkApplyGen += 1;
  return walletNetworkApplyGen;
}

function restoreHubCardSearchable(li, profileId) {
  const entry = loadWallet().find((e) => e.profile_id === profileId);
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
    const base = li.dataset.hubSearchable || walletHaystack(
      loadWallet().find((e) => e.profile_id === profileId) || {}
    );
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
  const qrId = walletEntryQrId(entry);
  return qrId ? `${base}?q=${encodeURIComponent(qrId)}` : base;
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
    return `<button type="button" class="hub-card-menu-item hub-card-menu-item--${control.variant} hub-card-menu-steward hub-card-control--${control.id}" data-id="${escapeHtml(entry.id)}" data-focus="${escapeHtml(control.focus)}">${escapeHtml(control.label)}</button>`;
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
  return statusMap[profileId] ?? getCachedNetworkStatus(profileId) ?? "checking";
}

function currentNetworkScanKind(profileId, scanKindMap = {}) {
  return scanKindMap[profileId] ?? getCachedNetworkScanKind(profileId) ?? null;
}

function applyNetworkChipsToDom(
  statusMap = {},
  alertStateMap = null,
  scanKindMap = {},
  resolverConfirmedMap = null
) {
  if (!savedList) return;
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
      const entry = loadWallet().find((e) => e.profile_id === pid);
      const objectType = entry ? classifyObjectType(entry) : { label: "Object", tone: "general" };
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
  applyRevokedSinceVisitAlerts(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap);
}

function applyRevokedSinceVisitAlerts(
  _statusMap = {},
  alertStateMap = null,
  scanKindMap = {},
  resolverConfirmedMap = null
) {
  if (!savedList || !hubConfig.fetchNetworkStatus) return;

  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const pid = li.dataset.profileId;
    if (!pid) return;
    // DH-1: never show since-visit alert from session cache before fetch resolves.
    if (alertStateMap == null || alertStateMap[pid] === undefined) {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    const resolverConfirmed = resolverConfirmedMap?.[pid] === true;
    const scanKind =
      scanKindMap[pid] !== undefined
        ? scanKindMap[pid]
        : getLatestResolvedScanKind(pid) ?? getCachedNetworkScanKind(pid);
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
    setRevokedSinceVisitAlertVisible(li, pid, show);
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

/**
 * Maps for since-visit alerts from resolver-confirmed reads this visit only.
 * @returns {{
 *   alertStateMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 * } | null}
 */
function buildLatestResolvedPollMaps() {
  if (!hasLatestResolverNetworkPoll()) return null;
  const alertStateMap = {};
  const scanKindMap = {};
  const resolverConfirmedMap = {};
  for (const entry of loadWallet()) {
    const pid = entry.profile_id;
    if (!pid || !isResolverConfirmedProfile(pid)) continue;
    const resolved = getLatestResolvedAlertState(pid);
    if (resolved == null) continue;
    alertStateMap[pid] = resolved;
    scanKindMap[pid] = getLatestResolvedScanKind(pid);
    resolverConfirmedMap[pid] = true;
  }
  return { alertStateMap, scanKindMap, resolverConfirmedMap };
}

function reapplyRevokedSinceVisitFromLatestResolved() {
  if (!savedList || !hubConfig.fetchNetworkStatus) return;
  const maps = buildLatestResolvedPollMaps();
  if (!maps) {
    applyRevokedSinceVisitAlerts({}, null);
    return;
  }
  applyRevokedSinceVisitAlerts(
    {},
    maps.alertStateMap,
    maps.scanKindMap,
    maps.resolverConfirmedMap
  );
}

async function fetchAndApplyNetworkChips() {
  if (!hubConfig.fetchNetworkStatus || !savedList) return;
  const stored = loadWallet();
  if (stored.length === 0) return;
  const { entries, changed: qrBackfill } = normalizeWalletQrIds(stored);
  if (qrBackfill) saveWallet(entries);
  const gen = bumpWalletNetworkApplyGen();
  applyNetworkChipsToDom(
    Object.fromEntries(
      entries.map((e) => [e.profile_id, getCachedNetworkStatus(e.profile_id) ?? "checking"])
    )
  );
  await refreshWalletNetworkStatuses(entries, ({
    statusMap,
    alertStateMap,
    scanKindMap,
    resolverConfirmedMap,
  }) => {
    if (gen !== walletNetworkApplyGen) return;
    applyNetworkChipsToDom(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap);
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
  });
}

function syncHubInboxAlertGroups() {
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

function renderSavedRows() {
  const entries = loadWallet();
  if (!savedList || !savedGroup) return;

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
    const objectType = classifyObjectType(entry);
    const cardControls = buildHubCardControls({
      hasKeys: !!entry.owner_private_key_b58,
      pendingLiveProof: !!liveControlPendingForEntry(entry),
      scanKind: hubConfig.fetchNetworkStatus
        ? getCachedNetworkScanKind(entry.profile_id)
        : null,
    });
    const { inline: inlineControls, menu: menuControls } =
      partitionHubCardControls(cardControls);
    li.className = `hub-card-item hub-card-item--${objectType.tone}${
      inlineControls.length > 0 ? " hub-card-item--has-controls" : ""
    }`;
    li.dataset.hubSearchable = walletHaystack(entry);
    li.dataset.profileId = entry.profile_id;
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
      getCachedNetworkStatus(entry.profile_id) ?? "checking",
      getCachedNetworkScanKind(entry.profile_id)
    );
    const cardIcon = hubConfig.fetchNetworkStatus
      ? hubCardIconHtml(entry.profile_id)
      : `<span class="list-icon list-icon-tone-trust" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>`;
    const revokedAlert = hubConfig.fetchNetworkStatus
      ? `<div class="hub-card-status-alert" data-hub-searchable="${escapeHtml(CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET)} network" hidden role="status">
          <p class="hub-card-status-alert-text">${escapeHtml(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT)}</p>
          <div class="hub-card-status-alert-actions">
            <button type="button" class="hub-card-alert-dismiss">Got it</button>
            <a class="hub-card-alert-view-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">View scan</a>
          </div>
        </div>`
      : "";

    const menuBlock = hubCardMenuHtml(entry, menuControls);

    li.innerHTML = `
      <div class="hub-card-head">
        ${cardIcon}
        <span class="list-content">
          <span class="list-title">${escapeHtml(hubCardTitle(entry))}</span>
          <span class="hub-card-identity hub-card-identity--${identity.verifyTone}">${escapeHtml(identity.text)}</span>
          ${statusHtml}
          ${hubCardSubHtml(entry, lastUsed)}
        </span>
        <div class="hub-card-head-meta">
          ${menuBlock}
        </div>
      </div>
      ${revokedAlert}
      ${hubCardControlsHtml(entry, inlineControls)}
      <div class="hub-card-actions">
        <div class="hub-card-actions-primary">
          <button type="button" class="hub-card-action hub-use-keys" data-id="${escapeHtml(entry.id)}" title="Load signing keys into this tab, then open your card page">Open controls</button>
          <a class="hub-card-action hub-open-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">Open scan</a>
        </div>
      </div>`;
    savedList.appendChild(li);
  }

  bindRevokedAlertHandlers();

  savedList.querySelectorAll(".hub-card-control, .hub-card-menu-steward").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const focus = btn.getAttribute("data-focus");
      const entry = loadWallet().find((e) => e.id === id);
      if (!entry || !focus) return;
      acknowledgeNetworkSeenForEntry(entry);
      if (focus === "live-proof") {
        const pending = liveControlPendingForEntry(entry);
        if (pending) {
          openLiveControlProof(pending);
          return;
        }
      }
      if (!entry.owner_private_key_b58) {
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
      const id = btn.getAttribute("data-id");
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
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

      if (!entry.owner_private_key_b58) {
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
      const entry = loadWallet().find((e) => e.id === id);
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
      const entry = loadWallet().find((e) => e.id === id);
      if (!window.confirm("Remove this card from this device? Keys stay in any other tab until you close it.")) {
        return;
      }
      if (entry) {
        clearDefaultVouchIfProfile(entry.profile_id);
        clearSignLock(entry.profile_id);
        logDeviceActivity("remove_card", entry.label, {
          profile_id: entry.profile_id,
          qr_id: entry.qr_id ?? null,
        });
      }
      saveWallet(loadWallet().filter((e) => e.id !== id));
      renderSavedRows();
      syncHubInboxAlertGroups();
      applySearchFilter();
      notifyHubChanged();
    });
  });

  void fetchAndApplyNetworkChips();
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
    loadWallet().length > 0 ||
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

  refreshDeviceHub();
  notifyHubChanged();

  if (hubConfig.showLiveControlInbox) {
    startLiveControlInboxPolling();
    void refreshLiveControlInbox().then(() => {
      syncHubInboxAlertGroups();
      applySearchFilter();
      refreshEmptyHint();
      notifyHubChanged();
    });
    window.addEventListener("hc-live-control-inbox-changed", () => {
      syncHubInboxAlertGroups();
      syncBrowserNotifPrompts();
      renderSavedRows();
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
      if (hubConfig.showLiveControlInbox) {
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
      void fetchAndApplyNetworkChips();
    }
  });

  window.addEventListener("pagehide", () => snapshotNetworkSeenOnExit());

  window.addEventListener("hc-wallet-network-baseline-changed", () => {
    reapplyRevokedSinceVisitFromLatestResolved();
    syncHubInboxAlertGroups();
    notifyHubChanged();
  });

  window.addEventListener(NETWORK_REFRESHED, (e) => {
    const detail = e?.detail;
    if (
      detail?.alertStateMap &&
      detail?.resolverConfirmedMap &&
      hubConfig.fetchNetworkStatus
    ) {
      applyRevokedSinceVisitAlerts(
        detail.statusMap ?? {},
        detail.alertStateMap,
        detail.scanKindMap ?? {},
        detail.resolverConfirmedMap
      );
    } else {
      reapplyRevokedSinceVisitFromLatestResolved();
    }
    syncHubInboxAlertGroups();
    refreshEmptyHint();
    notifyHubChanged();
  });

  window.addEventListener(DEVICE_OS_REFRESHED, () => {
    reapplyRevokedSinceVisitFromLatestResolved();
    syncHubInboxAlertGroups();
    refreshEmptyHint();
    notifyHubChanged();
  });

  window.addEventListener("hc-tab-presence-changed", () => {
    syncHubInboxAlertGroups();
    refreshEmptyHint();
  });
}

window.addEventListener("hc-focus-hub-search", () => focusHubSearch());
