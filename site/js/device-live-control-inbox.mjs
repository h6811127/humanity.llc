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
  getLiveControlPollHealth,
  setLiveControlPollHealth,
  summarizeLiveControlPoll,
} from "./device-live-control-inbox-core.mjs";
import { loadWallet, walletEntryQrId } from "./device-wallet.mjs";

export { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs";

const POLL_MS = 5000;
/** Back off live-control polls after Worker/edge 429 (see investigation doc). */
const RATE_LIMIT_BACKOFF_MS = 60_000;

let pollBackoffUntil = 0;

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
    if (httpKind === "rate_limited") return { kind: "rate_limited" };
    if (httpKind === "unreachable") return { kind: "unreachable" };
    const body = await res.json();
    const item = parsePendingChallengeBody(body, entry);
    return item ? { kind: "pending", item } : { kind: "none" };
  } catch {
    return { kind: "unreachable" };
  }
}

export async function refreshLiveControlInbox() {
  if (Date.now() < pollBackoffUntil) return pending;
  const entries = loadWallet().filter((e) => isPollableWalletEntry(e));
  const results = await Promise.all(entries.map(fetchPendingForEntry));
  if (results.some((r) => r.kind === "rate_limited")) {
    pollBackoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  }
  const summary = summarizeLiveControlPoll(results, entries.length);
  const next = summary.pending;
  const prevHealth = getLiveControlPollHealth();
  setLiveControlPollHealth(summary.health);
  const changed =
    liveControlInboxChanged(pending, next) || prevHealth !== getLiveControlPollHealth();
  pending = next;
  if (changed) {
    window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
  }
  return pending;
}

export function startLiveControlInboxPolling() {
  if (pollTimer != null) return;
  const tick = () => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() < pollBackoffUntil) return;
    void refreshLiveControlInbox();
  };
  void tick();
  pollTimer = window.setInterval(tick, POLL_MS);
}

export function stopLiveControlInboxPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
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
