/** @typedef {{ profile_id?: string, qr_id?: string | null, handle?: string | null, label?: string | null, updatedAt?: number }} PresenceEntry */

export const PRESENCE_STALE_MS = 10000;
export const PRESENCE_HEARTBEAT_MS = 4000;
export const MAX_PRESENCE_ENTRIES = 20;
/** Matches worker PROFILE_ID (base58, 20–32 chars). */
export const PRESENCE_PROFILE_ID_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,32}$/;

/**
 * @param {unknown} profileId
 */
export function isValidPresenceProfileId(profileId) {
  return typeof profileId === "string" && PRESENCE_PROFILE_ID_PATTERN.test(profileId.trim());
}

/**
 * @param {PresenceEntry | null | undefined} entry
 * @param {number} [now]
 */
export function normalizePresenceEntry(entry, now = Date.now()) {
  if (!entry || !isValidPresenceProfileId(entry.profile_id)) return null;
  return {
    profile_id: String(entry.profile_id).trim(),
    qr_id: typeof entry.qr_id === "string" && entry.qr_id ? entry.qr_id : null,
    handle: typeof entry.handle === "string" ? entry.handle.slice(0, 64) : null,
    label: typeof entry.label === "string" ? entry.label.slice(0, 48) : null,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : now,
  };
}

/**
 * @param {Record<string, PresenceEntry>} map
 * @param {number} [max]
 */
export function capPresenceMap(map, max = MAX_PRESENCE_ENTRIES) {
  const entries = Object.entries(map).sort(
    (a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0)
  );
  return Object.fromEntries(entries.slice(0, max));
}

/**
 * @param {Record<string, PresenceEntry>} map
 * @param {number} [now]
 * @param {number} [staleMs]
 */
export function normalizePresenceMap(map, now = Date.now(), staleMs = PRESENCE_STALE_MS) {
  const working = { ...map };
  pruneStalePresence(working, now, staleMs);
  const cleaned = {};
  for (const [id, entry] of Object.entries(working)) {
    const normalized = normalizePresenceEntry(entry, now);
    if (normalized) cleaned[id] = normalized;
  }
  return capPresenceMap(cleaned);
}

/**
 * @param {Record<string, PresenceEntry>} map
 * @param {number} now
 * @param {number} [staleMs]
 * @returns {boolean} true when any entry was removed
 */
export function pruneStalePresence(map, now, staleMs = PRESENCE_STALE_MS) {
  let changed = false;
  for (const [id, entry] of Object.entries(map)) {
    if (!entry?.updatedAt || now - entry.updatedAt > staleMs) {
      delete map[id];
      changed = true;
    }
  }
  return changed;
}

/**
 * @param {{
 *   map: Record<string, PresenceEntry>,
 *   tabId: string,
 *   thisProfile: string | null,
 *   now?: number,
 *   staleMs?: number,
 * }} input
 */
export function listOtherTabsWithKeys(input) {
  const now = input.now ?? Date.now();
  const staleMs = input.staleMs ?? PRESENCE_STALE_MS;
  const map = { ...input.map };
  pruneStalePresence(map, now, staleMs);

  const others = [];
  for (const [id, entry] of Object.entries(map)) {
    if (id === input.tabId) continue;
    const normalized = normalizePresenceEntry(entry, now);
    if (!normalized) continue;
    if (input.thisProfile && normalized.profile_id === input.thisProfile) continue;
    others.push({ tabId: id, ...normalized });
  }
  others.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return { map, others };
}
