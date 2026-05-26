import { walletEntryQrId } from "./device-wallet.mjs";

/** @typedef {'none' | 'pending' | 'unreachable' | 'rate_limited'} LiveControlPollKind */

/** @typedef {'ok' | 'degraded' | 'offline'} LiveControlPollHealth */

/** @type {LiveControlPollHealth} */
let liveControlPollHealth = "ok";

/** @returns {LiveControlPollHealth} */
export function getLiveControlPollHealth() {
  return liveControlPollHealth;
}

/** @param {LiveControlPollHealth} health */
export function setLiveControlPollHealth(health) {
  liveControlPollHealth = health;
}

/**
 * @param {number} status HTTP status from challenge poll
 */
export function classifyChallengeHttpStatus(status) {
  if (status === 404) return "none";
  if (status === 429) return "rate_limited";
  if (status >= 200 && status < 300) return "ok";
  return "unreachable";
}

/**
 * @param {Array<{ kind: LiveControlPollKind, item?: LiveControlPendingItem }>} results
 * @param {number} pollableCount wallet rows that were polled
 * @returns {{ pending: LiveControlPendingItem[], health: LiveControlPollHealth }}
 */
export function summarizeLiveControlPoll(results, pollableCount) {
  const pending = results
    .filter((r) => r.kind === "pending" && r.item)
    .map((r) => r.item);
  const unreachable = results.filter(
    (r) => r.kind === "unreachable" || r.kind === "rate_limited"
  ).length;

  if (pollableCount === 0) {
    return { pending, health: "ok" };
  }
  if (unreachable === pollableCount) {
    return { pending, health: "offline" };
  }
  if (unreachable > 0) {
    return { pending, health: "degraded" };
  }
  return { pending, health: "ok" };
}

/** @typedef {{
 *   entry: Record<string, unknown>,
 *   challenge_id: string,
 *   return_url: string | null,
 *   owner_url: string | null,
 *   expires_at: string,
 * }} LiveControlPendingItem */

/** @typedef {{ profile_id?: unknown, qr_id?: unknown, scan_url?: unknown }} WalletPollEntry */

/**
 * @param {WalletPollEntry | null | undefined} entry
 */
export function isPollableWalletEntry(entry) {
  return typeof entry?.profile_id === "string" && !!walletEntryQrId(entry);
}

/**
 * @param {unknown} body
 * @param {Record<string, unknown>} entry
 * @returns {LiveControlPendingItem | null}
 */
export function parsePendingChallengeBody(body, entry) {
  if (!body || typeof body !== "object") return null;
  const record = /** @type {Record<string, unknown>} */ (body);
  if (record.status !== "pending" || !record.challenge_id) return null;
  return {
    entry,
    challenge_id: String(record.challenge_id),
    return_url: typeof record.return_url === "string" ? record.return_url : null,
    owner_url: typeof record.owner_url === "string" ? record.owner_url : null,
    expires_at: typeof record.expires_at === "string" ? record.expires_at : "",
  };
}

/**
 * @param {LiveControlPendingItem[]} items
 */
export function liveControlPendingSignature(items) {
  return items
    .map((p) => `${p.entry.profile_id}:${p.challenge_id}`)
    .sort()
    .join("|");
}

/**
 * @param {LiveControlPendingItem[]} prev
 * @param {LiveControlPendingItem[]} next
 */
export function liveControlInboxChanged(prev, next) {
  return liveControlPendingSignature(prev) !== liveControlPendingSignature(next);
}

/**
 * @param {string} iso
 * @param {number} [now]
 */
export function formatLiveControlExpiry(iso, now = Date.now()) {
  try {
    const exp = Date.parse(iso);
    if (Number.isNaN(exp)) return "";
    const mins = Math.max(0, Math.round((exp - now) / 60000));
    if (mins < 1) return "expires soon";
    if (mins === 1) return "expires in 1 min";
    return `expires in ${mins} min`;
  } catch {
    return "";
  }
}

/**
 * @param {{
 *   entry: Record<string, unknown>,
 *   challenge_id: string,
 *   owner_url?: string | null,
 * }} item
 * @param {string} [origin]
 */
export function buildLiveControlProofHref(item, origin = "https://humanity.llc") {
  if (item.owner_url) return item.owner_url;
  const url = new URL("/created/", origin);
  url.searchParams.set("profile_id", String(item.entry.profile_id));
  const qrId = walletEntryQrId(item.entry);
  if (qrId) url.searchParams.set("qr_id", qrId);
  url.searchParams.set("live_challenge", item.challenge_id);
  return url.href;
}
