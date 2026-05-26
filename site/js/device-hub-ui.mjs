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
import { openSaveKeysForThisTab } from "./device-notice-nav.mjs";
import {
  activateWalletEntry,
  getTabSession,
  openActivityNow,
  openCardNowPage,
} from "./device-keys.mjs";
import { loadPins, pinHaystack } from "./device-pins.mjs";
import {
  loadWallet,
  saveWallet,
  formatSavedAt,
  walletEntryKeyPreview,
  walletEntrySubtitle,
} from "./device-wallet.mjs";
import {
  getCachedNetworkAlertState,
  getCachedNetworkScanKind,
  getCachedNetworkStatus,
  getCachedVerification,
  isRevokedSinceLastVisit,
  CARD_REVOKED_ALERT_STATE,
  networkStatusChip,
  recordNetworkSeen,
  refreshWalletNetworkStatuses,
  snapshotNetworkSeenOnExit,
  syncLastSeenFromNetworkMap,
} from "./device-wallet-network.mjs";
import { getCardStatusUrl } from "./hc-sign.mjs";
import {
  humanTrustIconMeta,
  isEligibleVoucherState,
  verificationTrustChip,
} from "./human-trust-ui.mjs";
import {
  clearDefaultVouchIfProfile,
  isDefaultVouchProfile,
  setDefaultVouchProfile,
} from "./vouch-ready-keys.mjs";
import {
  CARD_DISABLED_SINCE_VISIT_ALERT_TEXT,
  CARD_DISABLED_SINCE_VISIT_SEARCH_SNIPPET,
} from "./wallet-network-baseline.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import {
  formatLiveControlExpiry,
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

  const detailParts = [];
  if (savedLabel) detailParts.push(`Last saved: ${escapeHtml(savedLabel)}`);
  if (keyPreview) detailParts.push(`Key: ${escapeHtml(keyPreview)}`);
  if (handle) detailParts.push(escapeHtml(handle));
  if (idPreview) detailParts.push(escapeHtml(idPreview));
  if (entry.profile_id && isDefaultVouchProfile(entry.profile_id)) {
    detailParts.push("Default for vouching");
  }

  const primarySub = handle || walletEntrySubtitle(entry);
  if (!primarySub && detailParts.length === 0) {
    return "";
  }

  const detailsHtml =
    detailParts.length > 0
      ? `<details class="hub-card-details"><summary class="hub-card-details-summary">More</summary><span class="hub-card-details-body">${detailParts.join("<br>")}</span></details>`
      : "";

  return `<span class="list-sub hub-card-sub hub-card-sub--compact"><span class="hub-card-sub-line">${escapeHtml(primarySub)}</span></span>${detailsHtml}`;
}

function scanUrlForEntry(entry) {
  if (entry.scan_url) return entry.scan_url;
  const base = `${location.origin}/c/${encodeURIComponent(entry.profile_id)}`;
  return entry.qr_id ? `${base}?q=${encodeURIComponent(entry.qr_id)}` : base;
}

function networkChipHtml(profileId, statusOverride, scanKindOverride) {
  const raw =
    statusOverride ?? getCachedNetworkStatus(profileId) ?? (hubConfig.fetchNetworkStatus ? "checking" : null);
  if (!raw) return "";
  const scanKind = scanKindOverride ?? getCachedNetworkScanKind(profileId);
  const chip = networkStatusChip(raw, scanKind);
  return `<span class="hub-card-network hub-card-network--${chip.tone}">${escapeHtml(chip.label)}</span>`;
}

function verificationChipHtml(profileId) {
  if (!hubConfig.fetchNetworkStatus) return "";
  const cached = getCachedVerification(profileId);
  const chip = verificationTrustChip({
    label: cached?.label,
    state: cached?.state,
  });
  return `<span class="hub-card-verification hub-card-verification--${chip.tone}">${escapeHtml(chip.label)}</span>`;
}

function hubCardIconHtml(profileId) {
  const cached = getCachedVerification(profileId);
  const meta = humanTrustIconMeta({
    label: cached?.label,
    state: cached?.state,
  });
  return `<span class="list-icon ${meta.toneClass}" aria-hidden="true">${meta.svg}</span>`;
}

function currentNetworkStatus(profileId, statusMap = {}) {
  return statusMap[profileId] ?? getCachedNetworkStatus(profileId) ?? "checking";
}

function currentNetworkScanKind(profileId, scanKindMap = {}) {
  return scanKindMap[profileId] ?? getCachedNetworkScanKind(profileId) ?? null;
}

function applyNetworkChipsToDom(statusMap = {}, alertStateMap = null, scanKindMap = {}) {
  if (!savedList) return;
  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const pid = li.dataset.profileId;
    if (!pid) return;
    const chipEl = li.querySelector(".hub-card-network");
    if (chipEl) {
      const status = currentNetworkStatus(pid, statusMap);
      const chip = networkStatusChip(status, currentNetworkScanKind(pid, scanKindMap));
      chipEl.className = `hub-card-network hub-card-network--${chip.tone}`;
      chipEl.textContent = chip.label;
    }
    const verifyEl = li.querySelector(".hub-card-verification");
    if (verifyEl) {
      const cached = getCachedVerification(pid);
      const vChip = verificationTrustChip({
        label: cached?.label,
        state: cached?.state,
      });
      verifyEl.className = `hub-card-verification hub-card-verification--${vChip.tone}`;
      verifyEl.textContent = vChip.label;
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
  applyRevokedSinceVisitAlerts(statusMap, alertStateMap);
}

function applyRevokedSinceVisitAlerts(_statusMap = {}, alertStateMap = null) {
  if (!savedList || !hubConfig.fetchNetworkStatus) return;

  savedList.querySelectorAll(".hub-card-item").forEach((li) => {
    const pid = li.dataset.profileId;
    if (!pid) return;
    // DH-1: never show since-visit alert from session cache before fetch resolves.
    if (alertStateMap == null || alertStateMap[pid] === undefined) {
      setRevokedSinceVisitAlertVisible(li, pid, false);
      return;
    }
    const alertState = alertStateMap[pid];
    const show = isRevokedSinceLastVisit(pid, alertState);
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
    getCachedNetworkAlertState(entry.profile_id) ?? "active"
  );
}

async function fetchAndApplyNetworkChips() {
  if (!hubConfig.fetchNetworkStatus || !savedList) return;
  const entries = loadWallet();
  if (entries.length === 0) return;
  const gen = bumpWalletNetworkApplyGen();
  applyNetworkChipsToDom(
    Object.fromEntries(
      entries.map((e) => [e.profile_id, getCachedNetworkStatus(e.profile_id) ?? "checking"])
    )
  );
  await refreshWalletNetworkStatuses(entries, ({ statusMap, alertStateMap, scanKindMap }) => {
    if (gen !== walletNetworkApplyGen) return;
    applyNetworkChipsToDom(statusMap, alertStateMap, scanKindMap);
    syncLastSeenFromNetworkMap(alertStateMap);
    const stored = loadWallet();
    let changed = false;
    const next = stored.map((e) => {
      const net = statusMap[e.profile_id];
      if (net && e.status !== net) {
        changed = true;
        return { ...e, status: net };
      }
      return e;
    });
    if (changed) saveWallet(next);
  });
}

function renderLiveControlInbox() {
  if (!liveControlGroup || !liveControlList || !hubConfig.showLiveControlInbox) {
    if (liveControlGroup) liveControlGroup.hidden = true;
    return;
  }

  const pending = getLiveControlPending();
  liveControlList.innerHTML = "";
  if (pending.length === 0) {
    liveControlGroup.hidden = true;
    return;
  }

  liveControlGroup.hidden = false;
  for (const item of pending) {
    const entry = item.entry;
    const label =
      typeof entry.label === "string" && entry.label
        ? entry.label
        : typeof entry.handle === "string" && entry.handle
          ? `@${entry.handle}`
          : "Saved card";
    const expiry = item.expires_at ? formatLiveControlExpiry(item.expires_at) : "";
    const sub = expiry ? `Someone is waiting · ${expiry}` : "Someone is waiting";

    const li = document.createElement("li");
    li.className = "list-row list-action device-live-control-row";
    li.dataset.hubSearchable = `live proof waiting ${label} ${entry.profile_id || ""}`.toLowerCase();
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

function renderNoticeRow() {
  if (!noticeGroup) return;
  const show = tabNoticeCount() > 0;
  noticeGroup.hidden = !show;
  if (!show) return;

  const session = getTabSession();
  const label = session?.handle
    ? `@${session.handle}`
    : session?.profile_id?.slice(0, 12) || "This tab";

  if (hubConfig.noticeMode === "keys-strip") {
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
  bumpWalletNetworkApplyGen();
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
    li.className = "hub-card-item";
    li.dataset.hubSearchable = walletHaystack(entry);
    li.dataset.profileId = entry.profile_id;
    const lastUsed = lastActivityForEntry(entry);
    const scan = scanUrlForEntry(entry);
    const netChip = hubConfig.fetchNetworkStatus
      ? networkChipHtml(entry.profile_id, getCachedNetworkStatus(entry.profile_id) ?? "checking")
      : "";
    const verifyChip = verificationChipHtml(entry.profile_id);
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

    const menuBlock = `
        <details class="hub-card-menu">
          <summary class="hub-card-menu-btn" aria-label="More">⋯</summary>
          <div class="hub-card-menu-panel">
            <button type="button" class="hub-card-menu-item hub-open-card" data-id="${escapeHtml(entry.id)}">Open card</button>
            <button type="button" class="hub-card-menu-item hub-relabel" data-id="${escapeHtml(entry.id)}">Relabel</button>
            ${
              entry.owner_private_key_b58
                ? `<button type="button" class="hub-card-menu-item hub-default-vouch" data-id="${escapeHtml(entry.id)}">${
                    isDefaultVouchProfile(entry.profile_id)
                      ? "Default for vouching ✓"
                      : "Set as default for vouching"
                  }</button>`
                : ""
            }
            <button type="button" class="hub-card-menu-item hub-remove" data-id="${escapeHtml(entry.id)}">Remove from device</button>
          </div>
        </details>`;

    li.innerHTML = `
      <div class="hub-card-head">
        ${cardIcon}
        <span class="list-content">
          <span class="list-title">${escapeHtml(entry.label)}</span>
          ${hubCardSubHtml(entry, lastUsed)}
        </span>
        <div class="hub-card-head-meta">
          ${verifyChip}
          ${netChip}
          ${menuBlock}
        </div>
      </div>
      ${revokedAlert}
      <div class="hub-card-actions">
        <div class="hub-card-actions-primary">
          <button type="button" class="hub-card-action hub-use-keys" data-id="${escapeHtml(entry.id)}" title="Load signing keys into this tab, then open your card page">Use keys</button>
          <a class="hub-card-action hub-open-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">Open scan</a>
        </div>
      </div>`;
    savedList.appendChild(li);
  }

  bindRevokedAlertHandlers();

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
            getCardStatusUrl(String(entry.profile_id), entry.qr_id ?? null),
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
        logDeviceActivity("remove_card", entry.label, {
          profile_id: entry.profile_id,
          qr_id: entry.qr_id ?? null,
        });
      }
      saveWallet(loadWallet().filter((e) => e.id !== id));
      renderSavedRows();
      renderNoticeRow();
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
    tabNoticeCount() > 0 ||
    loadActivity().slice(0, HUB_RECENT_DISPLAY_LIMIT).length > 0 ||
    (hubConfig.showLiveControlInbox && getLiveControlPending().length > 0);
  emptyHint.hidden = hasData;
}

function notifyHubChanged() {
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

function applySearchFilter() {
  const q = searchInput?.value ?? "";
  const { matchCount } = applyDeviceHubSearch(deviceHub, q);
  if (hubConfig.showLiveControlInbox && liveControlGroup && !q.trim()) {
    liveControlGroup.hidden = getLiveControlPending().length === 0;
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
  renderNoticeRow();
  renderLiveControlInbox();
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
      renderLiveControlInbox();
      applySearchFilter();
      refreshEmptyHint();
      notifyHubChanged();
    });
    window.addEventListener("hc-live-control-inbox-changed", () => {
      renderLiveControlInbox();
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
    // Re-apply from cache + baseline only (e.g. Got it); never invent alerts without fetch.
    if (!savedList || !hubConfig.fetchNetworkStatus) return;
    const alertStateMap = Object.fromEntries(
      loadWallet()
        .map((e) => e.profile_id)
        .filter(Boolean)
        .map((pid) => [pid, getCachedNetworkAlertState(pid)])
        .filter(([, state]) => state != null)
    );
    applyRevokedSinceVisitAlerts({}, alertStateMap);
    notifyHubChanged();
  });
}

window.addEventListener("hc-focus-hub-search", () => focusHubSearch());
