/**
 * /wallet/ chrome refresh adapter (tab hint + active banner).
 * Click handler for Open controls: `bindWalletActiveOpenControls()` from wallet-page.mjs.
 */

import { gatherInboxInput } from "./device-inbox.mjs?v=64";
import { createdUrlForEntry, getTabSession, openCardNowPage } from "./device-keys.mjs";
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX,
  ORPHAN_KEYS_INBOX_TITLE,
} from "./device-orphan-keys-nav-core.mjs";
import {
  actOnOrphanRemovedTabKeys,
  clearOrphanKeysOnDevice,
} from "./device-orphan-keys-nav.mjs";
import { actOnOtherTabKeys, walletEntryForProfile } from "./device-notice-nav.mjs";
import { escapeEmphasisHtml } from "./device-emphasis-card-html.mjs";
import { shouldShowWalletTabHintCrossTabChrome } from "./wallet-tab-hint-chrome-core.mjs";

export { shouldShowWalletTabHintCrossTabChrome } from "./wallet-tab-hint-chrome-core.mjs";

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

/** @param {{ label?: string, handle?: string, profile_id: string }} entry */
function labelForPresence(entry) {
  if (entry.label) return entry.label;
  if (entry.handle) return `@${entry.handle}`;
  return `${String(entry.profile_id).slice(0, 12)}…`;
}

const TAB_HINT_MODIFIERS = ["active", "info", "warn", "urgent"];

/** @param {HTMLElement} card @param {'active'|'info'|'warn'|'urgent'} modifier */
function setTabHintModifier(card, modifier) {
  card.classList.add("hc-emphasis-card");
  for (const name of TAB_HINT_MODIFIERS) {
    card.classList.remove(`hc-emphasis-card--${name}`);
  }
  card.classList.add(`hc-emphasis-card--${modifier}`);
  const dot = card.querySelector(".hc-emphasis-card__dot");
  if (dot) {
    dot.className = `hc-emphasis-card__dot hc-emphasis-card__dot--${modifier === "active" ? "success" : modifier}`;
  }
}

function hideTabHintActions() {
  for (const id of ["wallet-tab-hint-focus", "wallet-tab-hint-use-keys", "wallet-tab-hint-clear"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
}

/** @param {HTMLElement | null} tabHint @param {ReturnType<typeof gatherInboxInput>} input */
function setTabHint(tabHint, input) {
  if (!tabHint) return;

  const hasShellBadge = Boolean(document.getElementById("shell-notif-badge"));
  const orphanCount = input.orphanRemovedEntries.length;
  const crossTabCount = input.crossTabEntries.length;

  const eyebrow = document.getElementById("wallet-tab-hint-eyebrow");
  const title = document.getElementById("wallet-tab-hint-title");
  const detail = document.getElementById("wallet-tab-hint-detail");
  const focusBtn = document.getElementById("wallet-tab-hint-focus");
  const useKeysBtn = document.getElementById("wallet-tab-hint-use-keys");
  const clearBtn = document.getElementById("wallet-tab-hint-clear");

  hideTabHintActions();

  if (
    !shouldShowWalletTabHintCrossTabChrome(hasShellBadge, orphanCount, crossTabCount)
  ) {
    if (title) title.hidden = true;
    tabHint.hidden = true;
    return;
  }

  if (orphanCount > 0) {
    const entry = input.orphanRemovedEntries[0];
    const label = escapeEmphasisHtml(labelForPresence(entry));
    const extra =
      orphanCount > 1
        ? ` (+${orphanCount - 1} other tab${orphanCount === 2 ? "" : "s"})`
        : "";

    setTabHintModifier(tabHint, "warn");
    if (eyebrow) eyebrow.textContent = ORPHAN_KEYS_INBOX_TITLE;
    if (title) {
      title.hidden = false;
      title.innerHTML = `${label}${extra}`;
    }
    if (detail) {
      detail.textContent =
        `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} Open that tab to close it, or clear keys on this device.`;
    }
    if (focusBtn) focusBtn.hidden = false;
    if (clearBtn) clearBtn.hidden = false;
    tabHint.hidden = false;
    return;
  }

  if (crossTabCount > 0) {
    const entry = input.crossTabEntries[0];
    const label = escapeEmphasisHtml(labelForPresence(entry));
    const extra =
      crossTabCount > 1
        ? ` (+${crossTabCount - 1} other tab${crossTabCount === 2 ? "" : "s"})`
        : "";
    const walletEntry = walletEntryForProfile(entry.profile_id);

    setTabHintModifier(tabHint, "info");
    if (eyebrow) eyebrow.textContent = "Keys in another tab";
    if (title) {
      title.hidden = false;
      title.innerHTML = `${label}${extra}`;
    }
    if (detail) {
      detail.textContent =
        "Save or manage in that tab’s card workspace, or open controls here on this page.";
    }
    if (focusBtn) focusBtn.hidden = false;
    if (useKeysBtn) useKeysBtn.hidden = !walletEntry?.owner_private_key_b58;
    tabHint.hidden = false;
    return;
  }

  if (title) title.hidden = true;
  tabHint.hidden = true;
}

let tabHintListenersBound = false;

function ensureTabHintListeners() {
  if (tabHintListenersBound) return;
  tabHintListenersBound = true;

  document.getElementById("wallet-tab-hint-focus")?.addEventListener("click", (e) => {
    e.preventDefault();
    const input = gatherInboxInput();
    if (input.orphanRemovedEntries.length > 0) {
      actOnOrphanRemovedTabKeys(input.orphanRemovedEntries[0]);
      return;
    }
    if (input.crossTabEntries.length > 0) {
      actOnOtherTabKeys(input.crossTabEntries[0]);
    }
  });

  document.getElementById("wallet-tab-hint-use-keys")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const entry = gatherInboxInput().crossTabEntries[0];
    if (!entry) return;
    const walletEntry = walletEntryForProfile(entry.profile_id);
    if (!walletEntry?.owner_private_key_b58) return;
    let result = await activateWalletEntryGated(walletEntry);
    if (!result.ok && result.needsPin) {
      const pin = window.prompt("Enter PIN to take control in this tab:");
      if (pin != null && pin.trim()) {
        result = await activateWalletEntryGated(walletEntry, { pin });
      }
    }
    if (result.ok) {
      window.dispatchEvent(new Event("hc-device-hub-changed"));
    }
  });

  document.getElementById("wallet-tab-hint-clear")?.addEventListener("click", (e) => {
    e.preventDefault();
    const entry = gatherInboxInput().orphanRemovedEntries[0];
    if (entry && clearOrphanKeysOnDevice(entry)) {
      window.dispatchEvent(new Event("hc-device-hub-changed"));
    }
  });
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

  ensureTabHintListeners();
  const tabHint = document.getElementById("wallet-tab-hint");
  setTabHint(tabHint, gatherInboxInput());
  refreshWalletActiveBanner();
}
