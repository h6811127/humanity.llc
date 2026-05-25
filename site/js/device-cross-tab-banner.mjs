/**
 * Banner when signing keys are active in another tab on this device.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getOtherTabsWithKeys, requestFocusTab } from "./device-tab-presence.mjs";
import { loadWallet } from "./device-wallet.mjs";
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
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return false;

  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  if (!thisHasKeys) return true;
  return others.some((o) => o.profile_id !== session.profile_id);
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

function walletEntryForProfile(profileId) {
  return loadWallet().find((e) => e.profile_id === profileId) ?? null;
}

function bindCrossTabAction(root, entry) {
  const btn = root.querySelector("[data-cross-tab-action]");
  if (!btn || !entry?.tabId) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const focused = requestFocusTab(entry.tabId);
    if (!focused) {
      btn.setAttribute("aria-live", "polite");
      const sub = root.querySelector(".device-hub-notice-sub, .device-cross-tab-sub");
      if (sub) {
        sub.textContent =
          "Could not switch tabs automatically — use your browser tab bar.";
      }
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
        <span class="device-hub-notice-sub">${msg.label}${msg.extra} — tap to switch to that tab</span>
        <span class="device-hub-notice-chevron" aria-hidden="true">↗</span>
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
    }
    return;
  }

  if (!banner) return;

  if (!shouldShowCrossTabNotice()) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }

  const msg = crossTabMessage();
  if (!msg) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }

  banner.hidden = false;
  banner.innerHTML = `
    <strong>Signing keys in another tab</strong>
    <span class="device-cross-tab-sub">${msg.label}${msg.extra}</span>
    <button type="button" class="device-cross-tab-focus-btn" data-cross-tab-action>Switch to that tab</button>
    <span class="device-cross-tab-or">or</span>
    <a href="/wallet/">load keys from Saved cards</a>.`;
  bindCrossTabAction(banner, msg.primary);
}

export function crossTabNoticeCount() {
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return 0;
  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  if (!thisHasKeys) return others.length;
  return others.filter((o) => o.profile_id !== session.profile_id).length;
}

if (banner || hubSlot) {
  renderCrossTabKeysBanner();
  window.addEventListener("hc-tab-presence-changed", renderCrossTabKeysBanner);
  window.addEventListener("hc-device-hub-changed", renderCrossTabKeysBanner);
}
