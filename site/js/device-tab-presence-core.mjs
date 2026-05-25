/** @typedef {{ profile_id?: string, qr_id?: string | null, handle?: string | null, label?: string | null, updatedAt?: number }} PresenceEntry */

export const PRESENCE_STALE_MS = 10000;
export const PRESENCE_HEARTBEAT_MS = 4000;

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
    if (id === input.tabId || !entry?.profile_id) continue;
    if (input.thisProfile && entry.profile_id === input.thisProfile) continue;
    others.push({ tabId: id, ...entry });
  }
  others.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return { map, others };
}
