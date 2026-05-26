/**
 * Banner when signing keys are active in another tab on this device.
 */
import { activateWalletEntry, getTabSession, openCardNowPage } from "./device-keys.mjs";
import {
  ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX,
  ORPHAN_KEYS_INBOX_TITLE,
} from "./device-orphan-keys-nav-core.mjs";
import {
  actOnOrphanRemovedTabKeys,
  clearOrphanKeysOnDevice,
} from "./device-orphan-keys-nav.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { gatherInboxInput, getInboxItems } from "./device-inbox.mjs";
import { inboxItemsIncludeKind } from "./device-hub-inbox-alerts.mjs";
import { actOnOtherTabKeys, walletEntryForProfile } from "./device-notice-nav.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";
import { getCrossTabScanSnapshot } from "./device-cross-tab-state.mjs";
import {
  emphasisCardActionsHtml,
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  emphasisCardCtaLinkSecondary,
  emphasisCardCtaSecondary,
  escapeEmphasisHtml,
} from "./device-emphasis-card-html.mjs";

const banner = document.getElementById("device-cross-tab-banner");
const hubSlot = document.getElementById("device-hub-crosstab-notice");
const scanBanner = document.getElementById("scan-cross-tab-banner");

function escapeHtml(s) {
  return escapeEmphasisHtml(s);
}

function clearPageCrossTabBanner() {
  if (!banner) return;
  banner.hidden = true;
  banner.innerHTML = "";
  banner.classList.remove("hc-emphasis-card", "hc-emphasis-card--info", "hc-notice", "hc-notice--info");
}

function clearScanCrossTabBanner() {
  if (!scanBanner) return;
  scanBanner.hidden = true;
  scanBanner.innerHTML = "";
  scanBanner.classList.remove("hc-emphasis-card", "hc-emphasis-card--info");
  scanBanner.className = "scan-cross-tab-banner";
}

function renderPageCrossTabBanner() {
  if (!banner) return;

  if (!shouldShowCrossTabNotice()) {
    clearPageCrossTabBanner();
    return;
  }

  const others = gatherInboxInput().crossTabEntries;
  const msg = crossTabMessage(others);
  if (!msg) {
    clearPageCrossTabBanner();
    return;
  }

  const walletEntry = walletEntryForVouchHere(msg.primary.profile_id);
  const subtext = vouchCrossTabSubtext().replace(/^\s*-\s*/, "").trim();
  const detail = subtext
    ? `${subtext.charAt(0).toUpperCase()}${subtext.slice(1)}`
    : "Open that tab to continue.";

  const actions = [emphasisCardCtaButton("Open that tab", "data-cross-tab-action")];
  if (walletEntry) {
    actions.push(
      emphasisCardCtaSecondary("Open controls here", "data-cross-tab-use-keys")
    );
  }
  actions.push(emphasisCardCtaLinkSecondary("My cards", "/wallet/"));

  banner.hidden = false;
  banner.className = "hc-emphasis-card hc-emphasis-card--info device-cross-tab-banner";
  banner.innerHTML = emphasisCardBodyHtml({
    eyebrow: "Keys in another tab",
    title: `${msg.label}${msg.extra}`,
    detail,
    dot: "info",
    actionsHtml: emphasisCardActionsHtml(actions),
  });
  bindCrossTabAction(banner, msg.primary);
  bindUseKeysHere(banner, walletEntry?.profile_id ?? msg.primary.profile_id);
}

function labelForPresence(entry) {
  if (entry.label) return entry.label;
  if (entry.handle) return `@${entry.handle}`;
  return `${String(entry.profile_id).slice(0, 12)}…`;
}

function shouldShowCrossTabNotice() {
  if (shouldShowOrphanHubNotice()) return false;
  if (document.getElementById("shell-notif-badge")) {
    return inboxItemsIncludeKind(getInboxItems(), "cross_tab_keys");
  }
  return gatherInboxInput().crossTabEntries.length > 0;
}

function shouldShowOrphanHubNotice() {
  if (document.getElementById("shell-notif-badge")) {
    return inboxItemsIncludeKind(getInboxItems(), "orphan_keys_removed");
  }
  return gatherInboxInput().orphanRemovedEntries.length > 0;
}

function crossTabMessage(others) {
  if (others.length === 0) return null;
  const primary = others[0];
  const label = escapeHtml(labelForPresence(primary));
  const extra =
    others.length > 1
      ? ` (+${others.length - 1} other tab${others.length === 2 ? "" : "s"})`
      : "";
  return {
    primary,
    label,
    extra,
  };
}

function bindCrossTabAction(root, entry) {
  const btn = root.querySelector("[data-cross-tab-action]");
  if (!btn || !entry?.tabId) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!actOnOtherTabKeys(entry)) {
      renderCrossTabKeysBanner();
    }
  });
}

/**
 * @param {HTMLElement} root
 * @param {string | null} profileId
 * @param {{ stayOnPage?: boolean }} [opts]
 */
function bindUseKeysHere(root, profileId, opts = {}) {
  const useBtn = root.querySelector("[data-cross-tab-use-keys]");
  if (!useBtn || !profileId) return;
  const walletEntry = walletEntryForProfile(profileId);
  if (!walletEntry?.owner_private_key_b58) {
    useBtn.hidden = true;
    return;
  }
  useBtn.hidden = false;
  useBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    if (opts.stayOnPage) {
      activateWalletEntry(walletEntry);
      window.dispatchEvent(new Event("hc-device-hub-changed"));
      return;
    }
    openCardNowPage(walletEntry);
  });
}

function vouchCrossTabSubtext() {
  return getDefaultVouchProfileId()
    ? " - open that tab to vouch, or load keys here"
    : " - open that tab to sign, or load keys from My cards";
}

function walletEntryForVouchHere(primaryProfileId) {
  const defaultId = getDefaultVouchProfileId();
  if (defaultId) {
    const preferred = walletEntryForProfile(defaultId);
    if (preferred?.owner_private_key_b58) return preferred;
  }
  return walletEntryForProfile(primaryProfileId);
}

function bindOrphanClearKeys(root, entry) {
  const btn = root.querySelector("[data-orphan-clear-keys]");
  if (!btn || !entry?.profile_id) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (clearOrphanKeysOnDevice(entry)) {
      renderCrossTabKeysBanner();
    }
  });
}

function renderHubOrphanRemovedNotice() {
  if (!hubSlot) return;
  if (!shouldShowOrphanHubNotice()) {
    return false;
  }
  const others = gatherInboxInput().orphanRemovedEntries;
  const msg = crossTabMessage(others);
  if (!msg) {
    return false;
  }

  hubSlot.hidden = false;
  hubSlot.innerHTML = `
    <div class="device-hub-crosstab-card device-hub-crosstab-card--orphan" data-hub-searchable="keys removed card another tab">
      <button type="button" class="device-hub-notice-banner device-hub-notice-banner--info" data-orphan-focus-tab>
        <span class="device-hub-notice-title">${escapeHtml(ORPHAN_KEYS_INBOX_TITLE)}</span>
        <span class="device-hub-notice-sub">${escapeHtml(ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX)} · ${msg.label}${msg.extra}</span>
        <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="device-hub-notice-secondary" data-orphan-clear-keys>Clear keys on this device</button>
    </div>`;

  hubSlot.querySelector("[data-orphan-focus-tab]")?.addEventListener("click", (e) => {
    e.preventDefault();
    actOnOrphanRemovedTabKeys(msg.primary);
  });
  bindOrphanClearKeys(hubSlot, msg.primary);
  return true;
}

function renderHubCrossTabNotice() {
  if (!hubSlot) return;
  if (renderHubOrphanRemovedNotice()) {
    return;
  }
  if (!shouldShowCrossTabNotice()) {
    hubSlot.hidden = true;
    hubSlot.innerHTML = "";
    return;
  }
  const others = gatherInboxInput().crossTabEntries;
  const msg = crossTabMessage(others);
  if (!msg) {
    hubSlot.hidden = true;
    hubSlot.innerHTML = "";
    return;
  }
  const walletEntry = walletEntryForVouchHere(msg.primary.profile_id);
  const useKeysBtn = walletEntry
    ? `<button type="button" class="device-hub-notice-secondary" data-cross-tab-use-keys>Open controls here</button>`
    : "";

  hubSlot.hidden = false;
  hubSlot.innerHTML = `
    <div class="device-hub-crosstab-card" data-hub-searchable="keys another tab">
      <button type="button" class="device-hub-notice-banner device-hub-notice-banner--info" data-cross-tab-action>
        <span class="device-hub-notice-title">Keys in another tab</span>
        <span class="device-hub-notice-sub">${msg.label}${msg.extra}${vouchCrossTabSubtext()}</span>
        <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
      </button>
      ${useKeysBtn}
    </div>`;
  bindCrossTabAction(hubSlot, msg.primary);
  bindUseKeysHere(hubSlot, walletEntry?.profile_id ?? msg.primary.profile_id);
}

function renderScanCrossTabNotice() {
  if (!scanBanner) return;

  const session = getTabSession();
  if (session?.owner_private_key_b58) {
    clearScanCrossTabBanner();
    return;
  }

  const snap = getCrossTabScanSnapshot();
  if (!snap.show || snap.entries.length === 0) {
    clearScanCrossTabBanner();
    return;
  }

  const msg = crossTabMessage(snap.entries);
  if (!msg) {
    clearScanCrossTabBanner();
    return;
  }

  const walletEntry = walletEntryForVouchHere(msg.primary.profile_id);
  const subtext = vouchCrossTabSubtext().replace(/^\s*-\s*/, "").trim();
  const detail = subtext
    ? `${subtext.charAt(0).toUpperCase()}${subtext.slice(1)}`
    : "Open that tab to vouch.";

  const actions = [emphasisCardCtaButton("Open that tab", "data-cross-tab-action")];
  if (walletEntry) {
    actions.push(
      emphasisCardCtaSecondary("Open controls here", "data-cross-tab-use-keys")
    );
  }

  scanBanner.hidden = false;
  scanBanner.className = "hc-emphasis-card hc-emphasis-card--info scan-cross-tab-banner";
  scanBanner.innerHTML = emphasisCardBodyHtml({
    eyebrow: "Keys in another tab",
    title: `${msg.label}${msg.extra}`,
    detail,
    dot: "info",
    actionsHtml: emphasisCardActionsHtml(actions),
  });
  bindCrossTabAction(scanBanner, msg.primary);
  bindUseKeysHere(scanBanner, walletEntry?.profile_id ?? msg.primary.profile_id, {
    stayOnPage: true,
  });
}

export function renderCrossTabKeysBanner() {
  renderScanCrossTabNotice();

  if (document.getElementById("shell-notif-badge")) {
    renderHubCrossTabNotice();
    clearPageCrossTabBanner();
    return;
  }

  renderPageCrossTabBanner();
}

let crossTabListenersBound = false;

function ensureCrossTabListeners() {
  if (crossTabListenersBound) return;
  crossTabListenersBound = true;
  // Phase 2: device-chrome-refresh owns cross-tab refresh scheduling.
}

if (banner || hubSlot || scanBanner) {
  ensureCrossTabListeners();
  renderCrossTabKeysBanner();
}
