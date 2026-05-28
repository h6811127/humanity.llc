/** @typedef {{ profile_id?: string, qr_id?: string | null, handle?: string | null, label?: string | null, updatedAt?: number }} PresenceEntry */

export const PRESENCE_STALE_MS = 10000;
/** Visible-tab heartbeat interval (10s - cuts cross-tab chrome churn vs 5s). */
export const PRESENCE_HEARTBEAT_MS = 10_000;

/** Coalesce burst `hc-tab-presence-changed` events (multi-tab storage fan-out). */
export const PRESENCE_CHANGE_COALESCE_MS = 400;
/** UI only - must have heartbeated recently (avoids ghost rows before prune). */
/** UI stale threshold - must exceed heartbeat so rows stay visible between ticks. */
export const PRESENCE_SHOW_MS = PRESENCE_HEARTBEAT_MS + 3000;

/**
 * Public metadata only - used to skip redundant localStorage writes.
 * @param {PresenceEntry | null | undefined} entry
 */
export function presenceMetadataFingerprint(entry) {
  if (!entry) return "";
  return [
    String(entry.profile_id ?? ""),
    entry.qr_id ?? "",
    entry.handle ?? "",
    entry.label ?? "",
  ].join("\0");
}

/**
 * Whether to rewrite this tab's presence row (and fan out storage).
 * @param {PresenceEntry | null | undefined} existing
 * @param {PresenceEntry | null | undefined} next
 * @param {number} now
 * @param {{ heartbeatMs?: number, showMs?: number }} [opts]
 */
export function shouldTouchPresenceRow(existing, next, now, opts = {}) {
  const heartbeatMs = opts.heartbeatMs ?? PRESENCE_HEARTBEAT_MS;
  const showMs = opts.showMs ?? PRESENCE_SHOW_MS;
  const nextNorm = normalizePresenceEntry(next, now);
  if (!nextNorm) return true;
  if (!existing) return true;
  const existingNorm = normalizePresenceEntry(existing, now);
  if (!existingNorm) return true;
  if (presenceMetadataFingerprint(existingNorm) !== presenceMetadataFingerprint(nextNorm)) {
    return true;
  }
  const age = now - (existingNorm.updatedAt ?? 0);
  // Skip keep-alive rewrites for one heartbeat (cuts cross-tab storage + chrome churn).
  if (age < heartbeatMs) return false;
  // Refresh updatedAt before listOtherTabsWithKeys hides the row (PRESENCE_SHOW_MS).
  const refreshBeforeHideMs = Math.max(heartbeatMs, showMs - 1000);
  if (age >= refreshBeforeHideMs) return true;
  return false;
}
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
 * @param {Record<string, PresenceEntry>} map
 * @param {string} profileId
 * @returns {{ map: Record<string, PresenceEntry>, changed: boolean }}
 */
export function removePresenceRowsForProfile(map, profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return { map, changed: false };
  let changed = false;
  for (const [id, entry] of Object.entries(map)) {
    if (entry?.profile_id === pid) {
      delete map[id];
      changed = true;
    }
  }
  return { map, changed };
}

/**
 * @param {{
 *   map: Record<string, PresenceEntry>,
 *   tabId: string,
 *   thisProfile: string | null,
 *   savedProfileIds?: Set<string> | string[],
 *   removedProfileIds?: Set<string> | string[],
 *   orphanRemovedOnly?: boolean
 *   now?: number,
 *   staleMs?: number,
 *   showMs?: number,
 * }} input
 */
/**
 * Skip visible-tab presence heartbeats when this tab has keys but no other live tabs.
 * Still sync when clearing keys (session empty) so stale rows are removed.
 *
 * @param {Record<string, PresenceEntry>} map
 * @param {string} tabId
 * @param {boolean} sessionHasSigningKeys
 * @param {number} [now]
 */
export function shouldSkipPresenceHeartbeat(map, tabId, sessionHasSigningKeys, now = Date.now()) {
  if (!sessionHasSigningKeys) return false;
  const normalized = normalizePresenceMap(map, now);
  for (const id of Object.keys(normalized)) {
    if (id !== tabId) return false;
  }
  return true;
}

export function listOtherTabsWithKeys(input) {
  const now = input.now ?? Date.now();
  const staleMs = input.staleMs ?? PRESENCE_STALE_MS;
  const showMs = input.showMs ?? PRESENCE_SHOW_MS;
  const orphanRemovedOnly = Boolean(input.orphanRemovedOnly);
  const saved =
    input.savedProfileIds instanceof Set
      ? input.savedProfileIds
      : new Set(input.savedProfileIds ?? []);
  const removed =
    input.removedProfileIds instanceof Set
      ? input.removedProfileIds
      : new Set(input.removedProfileIds ?? []);
  const map = { ...input.map };
  pruneStalePresence(map, now, staleMs);

  const others = [];
  for (const [id, entry] of Object.entries(map)) {
    if (id === input.tabId) continue;
    const normalized = normalizePresenceEntry(entry, now);
    if (!normalized) continue;
    if (now - normalized.updatedAt > showMs) continue;
    if (input.thisProfile && normalized.profile_id === input.thisProfile) continue;
    if (orphanRemovedOnly) {
      if (!removed.has(normalized.profile_id)) continue;
    } else {
      if (saved.has(normalized.profile_id)) continue;
      if (removed.has(normalized.profile_id)) continue;
    }
    others.push({ tabId: id, ...normalized });
  }
  others.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return { map, others };
}
