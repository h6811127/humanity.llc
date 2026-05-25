/**
 * Banner when signing keys are active in another tab on this device.
 */
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { actOnOtherTabKeys, walletEntryForProfile } from "./device-notice-nav.mjs";
import { openCardNowPage } from "./device-keys.mjs";

const banner = document.getElementById("device-cross-tab-banner");
const hubSlot = document.getElementById("device-hub-crosstab-notice");

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
  return getOtherTabsWithKeys().length > 0;
}

function crossTabMessage() {
  const others = getOtherTabsWithKeys();
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

function bindUseKeysHere(root, profileId) {
  const useBtn = root.querySelector("[data-cross-tab-use-keys]");
  if (!useBtn || !profileId) return;
  const walletEntry = walletEntryForProfile(profileId);
  if (!walletEntry) {
    useBtn.hidden = true;
    return;
  }
  useBtn.hidden = false;
  useBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    openCardNowPage(walletEntry);
  });
}

function renderHubCrossTabNotice() {
  if (!hubSlot) return;
  if (!shouldShowCrossTabNotice()) {
    hubSlot.hidden = true;
    hubSlot.innerHTML = "";
    return;
  }
  const msg = crossTabMessage();
  if (!msg) {
    hubSlot.hidden = true;
    hubSlot.innerHTML = "";
    return;
  }
  const walletEntry = walletEntryForProfile(msg.primary.profile_id);
  const useKeysBtn = walletEntry
    ? `<button type="button" class="device-hub-notice-secondary" data-cross-tab-use-keys>Use keys here</button>`
    : "";

  hubSlot.hidden = false;
  hubSlot.innerHTML = `
    <div class="device-hub-crosstab-card" data-hub-searchable="keys another tab">
      <button type="button" class="device-hub-notice-banner device-hub-notice-banner--info" data-cross-tab-action>
        <span class="device-hub-notice-title">Keys in another tab</span>
        <span class="device-hub-notice-sub">${msg.label}${msg.extra} — tap to open signing</span>
        <span class="device-hub-notice-chevron" aria-hidden="true">›</span>
      </button>
      ${useKeysBtn}
    </div>`;
  bindCrossTabAction(hubSlot, msg.primary);
  bindUseKeysHere(hubSlot, msg.primary.profile_id);
}

export function renderCrossTabKeysBanner() {
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

  const msg = crossTabMessage();
  if (!msg) {
    banner.hidden = true;
    banner.innerHTML = "";
    banner.classList.remove("hc-notice", "hc-notice--info");
    return;
  }

  banner.hidden = false;
  banner.classList.add("hc-notice", "hc-notice--info");
  banner.innerHTML = `
    <strong>Signing keys in another tab</strong>
    <span class="device-cross-tab-sub">${msg.label}${msg.extra}</span>
    <button type="button" class="device-cross-tab-focus-btn" data-cross-tab-action>Open signing</button>
    <span class="device-cross-tab-or">or</span>
    <a href="/wallet/">load keys from Saved cards</a>.`;
  bindCrossTabAction(banner, msg.primary);
}

if (banner || hubSlot) {
  renderCrossTabKeysBanner();
  window.addEventListener("hc-tab-presence-changed", renderCrossTabKeysBanner);
  window.addEventListener("hc-device-hub-changed", renderCrossTabKeysBanner);
}
