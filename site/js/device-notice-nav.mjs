/**
 * Shared navigation for hub / glance device notices.
 */
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import {
  broadcastClearProfileKeys,
  getOtherTabsHoldingProfile,
  requestFocusTab,
} from "./device-tab-presence.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  otherTabSwitchConfirmMessage,
  resolveOtherTabKeysAction,
} from "./device-notice-nav-logic.mjs";

/**
 * @param {{ profile_id?: string, qr_id?: string | null }} [session]
 */
export function createdUrlForSession(session) {
  const url = new URL("/created/", location.origin);
  if (session?.profile_id) url.searchParams.set("profile_id", session.profile_id);
  if (session?.qr_id) url.searchParams.set("qr_id", session.qr_id);
  return url;
}

/** Navigate to /created/ for unsaved keys in this tab. */
export function openSaveKeysForThisTab() {
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
  location.href = createdUrlForSession(getTabSession()).href;
}

/**
 * @param {string} profileId
 * @param {string | null | undefined} [qrId]
 */
export function openCreatedForProfile(profileId, qrId) {
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
  location.href = createdUrlForSession({ profile_id: profileId, qr_id: qrId ?? null }).href;
}

/**
 * @param {string} profileId
 */
export function walletEntryForProfile(profileId) {
  return loadWallet().find((e) => e.profile_id === profileId) ?? null;
}

function closeHubOverlays() {
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
  window.dispatchEvent(new CustomEvent("hc-inbox-sheet-close"));
}

/**
 * Open keys for another tab: wallet when saved; otherwise focus the other tab only.
 * @param {{ tabId: string, profile_id: string, qr_id?: string | null }} entry
 * @returns {boolean} false when notice should be dismissed (same tab already has keys)
 */
export function actOnOtherTabKeys(entry) {
  const session = getTabSession();
  const walletEntry = walletEntryForProfile(entry.profile_id);
  const plan = resolveOtherTabKeysAction({
    session,
    entry,
    hasWalletEntry: !!walletEntry,
  });

  if (plan.kind === "dismiss") {
    window.dispatchEvent(new Event("hc-cross-tab-custody-invalidated"));
    return false;
  }

  if (plan.needsConfirm && !window.confirm(otherTabSwitchConfirmMessage(session, entry))) {
    return true;
  }

  closeHubOverlays();

  if (plan.kind === "open-wallet" || plan.kind === "focus-then-open-wallet") {
    openCardNowPage(walletEntry);
    return true;
  }

  requestFocusTab(entry.tabId);
  return true;
}

/**
 * Optional second confirm after remove-from-device when other tabs still heartbeat keys.
 * @param {string} profileId
 */
export function offerClearOtherTabKeysOnRemove(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return;
  const others = getOtherTabsHoldingProfile(pid);
  if (others.length === 0) return;
  if (
    !window.confirm(
      "Other open tabs still have signing keys for this card. Clear keys in those tabs too?"
    )
  ) {
    return;
  }
  broadcastClearProfileKeys(pid);
}
