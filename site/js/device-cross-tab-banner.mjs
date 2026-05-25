/**
 * Banner when signing keys are active in another tab on this device.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";

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

function createdUrlForPresence(entry) {
  const url = new URL("/created/", location.origin);
  url.searchParams.set("profile_id", entry.profile_id);
  if (entry.qr_id) url.searchParams.set("qr_id", entry.qr_id);
  return url.href;
}

function shouldShowCrossTabNotice() {
  if (tabNoticeCount() > 0) return false;

  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return false;

  if (!thisHasKeys) return true;
  return others.some((o) => o.profile_id !== session.profile_id);
}

function crossTabMessage() {
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return null;
  const primary = others[0];
  const label = escapeHtml(labelForPresence(primary));
  const manageHref = escapeHtml(createdUrlForPresence(primary));
  const extra =
    others.length > 1
      ? ` (+${others.length - 1} other tab${others.length === 2 ? "" : "s"})`
      : "";
  return {
    label,
    manageHref,
    extra,
  };
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
  hubSlot.hidden = false;
  hubSlot.innerHTML = `
    <ul class="list list-compact">
      <li class="list-row list-action device-hub-notice-row">
        <a href="${msg.manageHref}">
          <span class="list-content">
            <span class="list-title">Keys in another tab</span>
            <span class="list-sub">${msg.label}${msg.extra}</span>
          </span>
          <span class="list-chevron" aria-hidden="true">›</span>
        </a>
      </li>
    </ul>`;
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
    ${msg.label}${msg.extra}  -  switch to that tab to manage, or
    <a href="${msg.manageHref}">open /created/</a> here (load keys from a saved card).`;
}

if (banner || hubSlot) {
  renderCrossTabKeysBanner();
  window.addEventListener("hc-tab-presence-changed", renderCrossTabKeysBanner);
  window.addEventListener("hc-device-hub-changed", renderCrossTabKeysBanner);
}
