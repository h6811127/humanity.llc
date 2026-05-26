/**
 * Poll resolver for pending live-control challenges on saved wallet cards.
 * Signing stays on /created/  -  inbox only surfaces waiting requests.
 */
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { activateWalletEntry } from "./device-keys.mjs";
import {
  buildLiveControlProofHref,
  classifyChallengeHttpStatus,
  formatLiveControlExpiry,
  isPollableWalletEntry,
  liveControlInboxChanged,
  parsePendingChallengeBody,
  summarizeLiveControlPoll,
} from "./device-live-control-inbox-core.mjs";
import { loadWallet, walletEntryQrId } from "./device-wallet.mjs";

const POLL_MS = 5000;

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem[]} */
let pending = [];

/** @type {import("./device-live-control-inbox-core.mjs").LiveControlPollHealth} */
let pollHealth = "ok";

let pollTimer = null;

export { formatLiveControlExpiry };

export function getLiveControlPending() {
  return [...pending];
}

export function getLiveControlPendingCount() {
  return pending.length;
}

/** @returns {import("./device-live-control-inbox-core.mjs").LiveControlPollHealth} */
export function getLiveControlPollHealth() {
  return pollHealth;
}

/**
 * @param {Record<string, unknown>} entry
 * @returns {Promise<{ kind: import("./device-live-control-inbox-core.mjs").LiveControlPollKind, item?: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem }>}
 */
async function fetchPendingForEntry(entry) {
  if (!isPollableWalletEntry(entry)) return { kind: "none" };

  const profileId = entry.profile_id;
  const qrId = walletEntryQrId(entry);
  if (!qrId) return { kind: "none" };

  try {
    const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
      cache: "no-store",
    });
    const httpKind = classifyChallengeHttpStatus(res.status);
    if (httpKind === "none") return { kind: "none" };
    if (httpKind === "unreachable") return { kind: "unreachable" };
    const body = await res.json();
    const item = parsePendingChallengeBody(body, entry);
    return item ? { kind: "pending", item } : { kind: "none" };
  } catch {
    return { kind: "unreachable" };
  }
}

export async function refreshLiveControlInbox() {
  const entries = loadWallet().filter((e) => isPollableWalletEntry(e));
  const results = await Promise.all(entries.map(fetchPendingForEntry));
  const summary = summarizeLiveControlPoll(results, entries.length);
  const next = summary.pending;
  const prevHealth = pollHealth;
  pollHealth = summary.health;
  const changed = liveControlInboxChanged(pending, next) || prevHealth !== pollHealth;
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
