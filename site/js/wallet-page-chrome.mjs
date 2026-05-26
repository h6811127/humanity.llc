/**
 * /wallet/ chrome refresh adapter (tab hint + active banner).
 * Click handler for Open controls: `bindWalletActiveOpenControls()` from wallet-page.mjs.
 */

import { gatherInboxInput } from "./device-inbox.mjs?v=37";
import { createdUrlForEntry, getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";

/** @param {Record<string, unknown> | null} session */
export function walletEntryForSession(session) {
  if (!session?.profile_id) return null;
  const saved = loadWallet().find((e) => e.profile_id === session.profile_id);
  if (saved) return saved;
  if (!session.owner_private_key_b58) return null;
  return {
    profile_id: session.profile_id,
    qr_id: session.qr_id ?? null,
    owner_private_key_b58: session.owner_private_key_b58,
    owner_public_key_b58: session.owner_public_key_b58,
    handle: session.handle,
    manifesto_line: session.manifesto_line,
    scan_url: session.scan_url,
  };
}

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
      "Save or manage in that tab’s card workspace, or tap <strong>Open workspace</strong> below.";
    return;
  }
  tabHint.hidden = true;
}

function refreshWalletActiveBanner() {
  const activeBanner = document.getElementById("wallet-active-banner");
  const activeEyebrow = document.getElementById("wallet-active-eyebrow");
  const activeLabel = document.getElementById("wallet-active-label");
  const activeDetail = document.getElementById("wallet-active-detail");
  const activeLink = document.getElementById("wallet-active-link");
  const session = getTabSession();
  const hasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
  if (!activeBanner || !activeLabel || !activeDetail) return;
  if (!hasKeys) {
    activeBanner.hidden = true;
    return;
  }

  const label =
    session.wallet_label ||
    (session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12));
  activeBanner.hidden = false;
  if (activeEyebrow) activeEyebrow.textContent = "Active in this tab";
  activeLabel.textContent = label;
  activeDetail.textContent = "Signing keys stay here until you close this tab.";
  const entry = walletEntryForSession(session);
  if (activeLink && entry) {
    activeLink.href = createdUrlForEntry(entry);
  }
}

export function refreshWalletContextFromChrome() {
  if (!document.getElementById("wallet-page")) return;

  const tabHint = document.getElementById("wallet-tab-hint");
  setTabHint(tabHint, gatherInboxInput());
  refreshWalletActiveBanner();
}
