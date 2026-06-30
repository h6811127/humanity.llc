/**
 * Discovery pin detail — live snapshot chips from season board snapshot API.
 * Read-only projection; passive GET does not increment quorum.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P2-1 · docs/STATE_FIRST_UI_MODEL.md
 */
import { ROW_ROLE_STATUS_HINT } from "./city-game-map-board-core.mjs";
import {
  buildNodeChipsHtml,
  formatPinStateFromSnapshot,
  seasonSnapshotUrl,
} from "./city-game-map-snapshot-core.mjs";
import { escapeDiscoveryHtml } from "./discovery-region-browse-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

/**
 * @param {Record<string, unknown> | null | undefined} snapshot
 */
export function buildSnapshotNodeIndex(snapshot) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byNodeId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const byObjectId = new Map();
  const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  for (const row of nodes) {
    if (!row || typeof row !== "object") continue;
    const node = /** @type {Record<string, unknown>} */ (row);
    const nodeId = String(node.node_id ?? "").trim();
    if (nodeId) byNodeId.set(nodeId, node);
    const objectId = String(node.object_id ?? "").trim();
    if (objectId) byObjectId.set(objectId, node);
  }
  return { byNodeId, byObjectId };
}

/**
 * @param {DiscoveryPin} pin
 * @param {ReturnType<typeof buildSnapshotNodeIndex>} index
 */
export function resolveSnapshotRowForDiscoveryPin(pin, index) {
  const entryId = String(pin.facets?.entry_id ?? "").trim();
  if (entryId && index.byNodeId.has(entryId)) {
    return index.byNodeId.get(entryId) ?? null;
  }
  for (const objectId of pin.object_ids ?? []) {
    const id = String(objectId ?? "").trim();
    if (id && index.byObjectId.has(id)) return index.byObjectId.get(id) ?? null;
  }
  const primary = String(pin.primary_object_id ?? "").trim();
  if (primary && index.byObjectId.has(primary)) {
    return index.byObjectId.get(primary) ?? null;
  }
  return null;
}

/**
 * Compact state line for browse rows — snapshot headline or role hint; omit standalone without snapshot.
 * @param {DiscoveryPin} pin
 * @param {ReturnType<typeof buildSnapshotNodeIndex>} index
 */
export function resolveDiscoveryPinRowStateHeadline(pin, index) {
  const snap = resolveSnapshotRowForDiscoveryPin(pin, index);
  const hasSeasonLens = Array.isArray(pin.network_ids) && pin.network_ids.length > 0;
  if (!snap && !hasSeasonLens) return null;
  const headline = discoveryPinSnapshotHeadline(pin, snap);
  return headline?.trim() ? headline.trim() : null;
}

/**
 * @param {DiscoveryPin} pin
 * @param {Record<string, unknown> | null | undefined} snap
 */
export function discoveryPinSnapshotHeadline(pin, snap) {
  const role = String(pin.facets?.role ?? "").trim();
  const staticHint = ROW_ROLE_STATUS_HINT[role] ?? "";
  return formatPinStateFromSnapshot(
    /** @type {Parameters<typeof formatPinStateFromSnapshot>[0]} */ (snap),
    role,
    staticHint
  );
}

/**
 * @param {DiscoveryPin} pin
 * @param {Record<string, unknown> | null | undefined} snap
 */
export function renderDiscoveryPinSnapshotSection(pin, snap) {
  const headline = discoveryPinSnapshotHeadline(pin, snap);
  const chips = Array.isArray(snap?.chips) ? snap.chips : [];
  const chipsHtml = buildNodeChipsHtml(/** @type {Parameters<typeof buildNodeChipsHtml>[0]} */ (chips));
  return `<section class="discovery-pin-detail__state" aria-label="Current public state">
  <p class="discovery-pin-detail__state-headline">${escapeDiscoveryHtml(headline)}</p>
  ${chipsHtml}
</section>`;
}

/**
 * @param {string} seasonId
 * @param {string} origin
 */
export function discoverySeasonSnapshotUrl(seasonId, origin) {
  return seasonSnapshotUrl(seasonId, origin);
}

/**
 * @param {string} seasonId
 * @param {string} origin
 */
export async function fetchDiscoverySeasonSnapshot(seasonId, origin) {
  const id = String(seasonId ?? "").trim();
  if (!id) return null;
  try {
    const res = await fetch(discoverySeasonSnapshotUrl(id, origin), {
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return /** @type {Record<string, unknown>} */ (await res.json());
  } catch {
    return null;
  }
}
