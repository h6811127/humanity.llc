/**
 * Banner when signing keys are active in another tab on this device.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getOtherTabsWithKeys } from "./device-tab-presence.mjs";

const banner = document.getElementById("device-cross-tab-banner");

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

function shouldShowBanner() {
  if (!banner) return false;
  if (tabNoticeCount() > 0) return false;

  const session = getTabSession();
  const thisHasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  const others = getOtherTabsWithKeys();
  if (others.length === 0) return false;

  if (!thisHasKeys) return true;
  return others.some((o) => o.profile_id !== session.profile_id);
}

export function renderCrossTabKeysBanner() {
  if (!banner) return;

  if (document.getElementById("shell-notif-badge")) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }

  if (!shouldShowBanner()) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }

  const others = getOtherTabsWithKeys();
  const primary = others[0];
  const label = escapeHtml(labelForPresence(primary));
  const manageHref = escapeHtml(createdUrlForPresence(primary));
  const extra =
    others.length > 1
      ? ` (+${others.length - 1} other tab${others.length === 2 ? "" : "s"})`
      : "";

  banner.hidden = false;
  banner.innerHTML = `
    <strong>Signing keys in another tab</strong>
    ${label}${extra}  -  switch to that tab to manage, or
    <a href="${manageHref}">open /created/</a> here (load keys from a saved card).`;
}

if (banner) {
  renderCrossTabKeysBanner();
  window.addEventListener("hc-tab-presence-changed", renderCrossTabKeysBanner);
  window.addEventListener("hc-device-hub-changed", renderCrossTabKeysBanner);
}
