import { walletEntryQrId } from "./device-wallet.mjs";

/** @typedef {'none' | 'pending' | 'unchanged' | 'unreachable' | 'rate_limited'} LiveControlPollKind */

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
  if (status === 304) return "unchanged";
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
 * Stable key for round-robin live-control poll slots.
 * @param {WalletPollEntry | null | undefined} entry
 */
export function liveControlPollEntryKey(entry) {
  if (!isPollableWalletEntry(entry)) return "";
  return `${entry.profile_id}:${walletEntryQrId(entry)}`;
}

/**
 * @param {LiveControlPollHealth} currentHealth
 * @param {LiveControlPollKind} resultKind result from a single-card poll tick
 * @returns {LiveControlPollHealth}
 */
export function applySingleCardPollHealth(currentHealth, resultKind) {
  if (resultKind === "rate_limited") return currentHealth;
  if (resultKind === "unreachable") {
    return currentHealth === "ok" ? "degraded" : currentHealth;
  }
  return "ok";
}

/**
 * @param {Map<string, LiveControlPendingItem | null>} slots
 * @param {WalletPollEntry} entry
 * @param {{ kind: LiveControlPollKind, item?: LiveControlPendingItem }} result
 */
export function updateLiveControlPollSlot(slots, entry, result) {
  const key = liveControlPollEntryKey(entry);
  if (!key) return;
  if (result.kind === "pending" && result.item) {
    slots.set(key, result.item);
    return;
  }
  if (result.kind === "none") {
    slots.delete(key);
  }
}

/**
 * @param {WalletPollEntry[]} entries
 * @param {Map<string, LiveControlPendingItem | null>} slots
 */
export function pendingItemsFromPollSlots(entries, slots) {
  const next = [];
  for (const entry of entries) {
    const key = liveControlPollEntryKey(entry);
    if (!key) continue;
    const item = slots.get(key);
    if (item) next.push(item);
  }
  return next;
}

/**
 * @param {Map<string, LiveControlPendingItem | null>} slots
 * @param {WalletPollEntry[]} entries
 */
export function pruneLiveControlPollSlots(slots, entries) {
  const valid = new Set(
    entries.map((e) => liveControlPollEntryKey(e)).filter(Boolean)
  );
  for (const key of slots.keys()) {
    if (!valid.has(key)) slots.delete(key);
  }
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
