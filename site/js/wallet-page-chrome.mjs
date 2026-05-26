/**
 * /wallet/ chrome refresh adapter (tab hint + active banner).
 * This lets the shared device chrome coordinator update wallet-only UI without
 * importing wallet-page.mjs (which has page-init side effects).
 */

import { gatherInboxInput } from "./device-inbox.mjs?v=37";
import { getTabSession } from "./device-keys.mjs";

function setTabHint(tabHint, input) {
  if (!tabHint) return;
  if (input.orphanRemovedEntries.length > 0) {
    tabHint.hidden = false;
    tabHint.textContent =
      "Keys for a card you removed are still open in another tab. " +
      "Open that tab to close it, or clear keys from the device hub.";
    return;
  }
  if (input.crossTabEntries.length > 0) {
    tabHint.hidden = false;
    tabHint.innerHTML =
      "Keys are in another tab. " +
      "Save or manage in that tab’s card workspace, or tap <strong>Open controls</strong> below.";
    return;
  }
  tabHint.hidden = true;
}

export function refreshWalletContextFromChrome() {
  if (!document.getElementById("wallet-page")) return;

  const tabHint = document.getElementById("wallet-tab-hint");
  const activeBanner = document.getElementById("wallet-active-banner");
  const activeText = document.getElementById("wallet-active-text");
  const activeLink = document.getElementById("wallet-active-link");

  const input = gatherInboxInput();
  setTabHint(tabHint, input);

  const session = getTabSession();
  const hasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  if (!activeBanner || !activeText) return;
  if (!hasKeys) {
    activeBanner.hidden = true;
    return;
  }

  const label =
    session.wallet_label ||
    (session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12));
  activeBanner.hidden = false;
  activeText.textContent = `Managing in this tab: ${label}`;
  if (activeLink) {
    const url = new URL("/created/", location.origin);
    url.searchParams.set("profile_id", session.profile_id);
    if (session.qr_id) url.searchParams.set("qr_id", session.qr_id);
    activeLink.href = url.href;
  }
}

