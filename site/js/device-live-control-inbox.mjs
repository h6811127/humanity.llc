/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 */
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { activateWalletEntry, createdUrlForEntry } from "./device-keys.mjs";
import {
  buildLiveControlProofHref,
  formatLiveControlExpiry,
  isPollableWalletEntry,
  liveControlInboxChanged,
  parsePendingChallengeBody,
} from "./device-live-control-inbox-core.mjs";
import { loadWallet } from "./device-wallet.mjs";

const POLL_MS = 5000;

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
let pending = [];

let pollTimer = null;

export { formatLiveControlExpiry };

export function getLiveControlPending() {
  return [...pending];
}

export function getLiveControlPendingCount() {
  return pending.length;
}

/**
 * @param {Record<string, unknown>} entry
 */
async function fetchPendingForEntry(entry) {
  if (!isPollableWalletEntry(entry)) return null;

  const profileId = entry.profile_id;
  const qrId = entry.qr_id;

  try {
    const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = await res.json();
    return parsePendingChallengeBody(body, entry);
  } catch {
    return null;
  }
}

export async function refreshLiveControlInbox() {
  const entries = loadWallet().filter((e) => isPollableWalletEntry(e));
  const results = await Promise.all(entries.map(fetchPendingForEntry));
  const next = results.filter(Boolean);
  const changed = liveControlInboxChanged(pending, next);
  pending = next;
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  return pending;
}

export function startLiveControlInboxPolling() {
  if (pollTimer != null) return;
  void refreshLiveControlInbox();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void refreshLiveControlInbox();
    }
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisibilityLiveControl);
}

function onVisibilityLiveControl() {
  if (document.visibilityState === "visible") {
    void refreshLiveControlInbox();
  }
}

export function stopLiveControlInboxPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityLiveControl);
}

/**
 * @param {{
 *   entry: Record<string, unknown>,
 *   challenge_id: string,
 *   owner_url?: string | null,
 * }} item
 */
export function openLiveControlProof(item) {
  activateWalletEntry(item.entry);
  location.href = buildLiveControlProofHref(item, location.origin);
}
