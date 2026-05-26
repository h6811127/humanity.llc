/**
 * Banner when signing keys are active in another tab on this device.
 */
import { activateWalletEntry, getTabSession, openCardNowPage } from "./device-keys.mjs";
import { getOtherTabsWithKeys, requestFocusTab } from "./device-tab-presence.mjs";
import { shouldShowCrossTabKeysNotice } from "./device-cross-tab-visibility.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import { getInboxItems } from "./device-inbox.mjs";
import { inboxItemsIncludeKind } from "./device-hub-inbox-alerts.mjs";
import { actOnOtherTabKeys, walletEntryForProfile } from "./device-notice-nav.mjs";
import { getDefaultVouchProfileId } from "./vouch-ready-keys.mjs";

const banner = document.getElementById("device-cross-tab-banner");
const hubSlot = document.getElementById("device-hub-crosstab-notice");
const scanBanner = document.getElementById("scan-cross-tab-banner");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function labelForPresence(entry) {
  if (entry.label) return entry.label;
  if (entry.handle) return `@${entry.handle}`;
  return `${String(entry.profile_id).slice(0, 12)}…`;
}

function shouldShowCrossTabNotice() {
  if (document.getElementById("shell-notif-badge")) {
    return inboxItemsIncludeKind(getInboxItems(), "cross_tab_keys");
  }
  return shouldShowCrossTabKeysNotice(getOtherTabsWithKeys().length, tabNoticeCount());
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
    ? " — open that tab to vouch, or load keys here"
    : " — open that tab to sign, or load keys from My cards";
}

function walletEntryForVouchHere(primaryProfileId) {
  const defaultId = getDefaultVouchProfileId();
  if (defaultId) {
    const preferred = walletEntryForProfile(defaultId);
    if (preferred?.owner_private_key_b58) return preferred;
  }
  return walletEntryForProfile(primaryProfileId);
}

function renderHubCrossTabNotice() {
  if (!hubSlot) return;
  if (!shouldShowCrossTabNotice()) {
    hubSlot.hidden = true;
    hubSlot.innerHTML = "";
    return;
  }
  const others = getOtherTabsWithKeys();
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
    scanBanner.hidden = true;
    scanBanner.innerHTML = "";
    return;
  }

  if (!shouldShowCrossTabNotice()) {
    scanBanner.hidden = true;
    scanBanner.innerHTML = "";
    return;
  }

  const others = getOtherTabsWithKeys({ includeSavedProfiles: true });
  const msg = crossTabMessage(others);
  if (!msg) {
    scanBanner.hidden = true;
    scanBanner.innerHTML = "";
    return;
  }

  const walletEntry = walletEntryForVouchHere(msg.primary.profile_id);
  const useKeysBtn = walletEntry
    ? `<button type="button" class="scan-cross-tab-use-keys" data-cross-tab-use-keys>Open controls here</button>`
    : "";

  scanBanner.hidden = false;
  scanBanner.innerHTML = `
    <strong>Signing keys in another tab</strong>
    <span class="scan-cross-tab-sub">${msg.label}${msg.extra} — open that tab to vouch${walletEntry ? ", or:" : "."}</span>
    <div class="scan-cross-tab-actions">
      <button type="button" class="scan-cross-tab-focus-btn" data-cross-tab-action>Open that tab</button>
      ${useKeysBtn}
    </div>`;

  const focusBtn = scanBanner.querySelector("[data-cross-tab-action]");
  focusBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    requestFocusTab(msg.primary.tabId);
  });

  bindUseKeysHere(scanBanner, walletEntry?.profile_id ?? msg.primary.profile_id, {
    stayOnPage: true,
  });
}

export function renderCrossTabKeysBanner() {
  renderScanCrossTabNotice();

  if (document.getElementById("shell-notif-badge")) {
    renderHubCrossTabNotice();
    if (banner) {
      banner.hidden = true;
      banner.innerHTML = "";
      banner.classList.remove("hc-notice", "hc-notice--info");
    }
    return;
  }

  if (!banner) return;

  if (!shouldShowCrossTabNotice()) {
    banner.hidden = true;
    banner.innerHTML = "";
    banner.classList.remove("hc-notice", "hc-notice--info");
    return;
  }

  const others = getOtherTabsWithKeys();
  const msg = crossTabMessage(others);
  if (!msg) {
    banner.hidden = true;
    banner.innerHTML = "";
    banner.classList.remove("hc-notice", "hc-notice--info");
    return;
  }

  const walletEntry = walletEntryForVouchHere(msg.primary.profile_id);
  const useKeysInline = walletEntry
    ? `<button type="button" class="device-cross-tab-focus-btn" data-cross-tab-use-keys>Open controls here</button>
    <span class="device-cross-tab-or">or</span>`
    : "";

  banner.hidden = false;
  banner.classList.add("hc-notice", "hc-notice--info");
  banner.innerHTML = `
    <strong>Signing keys in another tab</strong>
    <span class="device-cross-tab-sub">${msg.label}${msg.extra}${vouchCrossTabSubtext()}</span>
    <button type="button" class="device-cross-tab-focus-btn" data-cross-tab-action>Open that tab</button>
    <span class="device-cross-tab-or">or</span>
    ${useKeysInline}
    <a href="/wallet/">My cards</a>.`;
  bindCrossTabAction(banner, msg.primary);
  bindUseKeysHere(banner, walletEntry?.profile_id ?? msg.primary.profile_id);
}

let crossTabListenersBound = false;

function ensureCrossTabListeners() {
  if (crossTabListenersBound) return;
  crossTabListenersBound = true;
  window.addEventListener("hc-tab-presence-changed", renderCrossTabKeysBanner);
  window.addEventListener("hc-device-hub-changed", renderCrossTabKeysBanner);
}

if (banner || hubSlot || scanBanner) {
  ensureCrossTabListeners();
  renderCrossTabKeysBanner();
}
