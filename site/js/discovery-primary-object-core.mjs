/**
 * Discovery pin primary-object selection — multi-object pins at scan time.
 * @see docs/DISCOVERY_PROJECTION.md § Primary-object selection policy · WS-DISCOVER-P3-3
 */
import { resolveNodeObjectType } from "./discovery-pin-projection-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

/**
 * @typedef {Object} DiscoveryPinObjectEntry
 * @property {string} object_id
 * @property {string} object_type
 * @property {string} label
 * @property {string | null} scan_url
 * @property {string[]} network_ids
 */

const PRIMARY_TYPE_PRECEDENCE = ["status_plate", "menu_board", "game_node"];

/**
 * @param {Record<string, unknown> | null | undefined} snap
 */
export function discoverySnapshotShowsCarePause(snap) {
  const chips = Array.isArray(snap?.chips) ? snap.chips : [];
  return chips.some((chip) => {
    if (!chip || typeof chip !== "object") return false;
    const kind = String(/** @type {Record<string, unknown>} */ (chip).kind ?? "").trim();
    return kind === "maintenance";
  });
}

/**
 * @param {DiscoveryPin} pin
 * @param {ReturnType<typeof import("./discovery-region-browse-core.mjs").buildSeasonNodeScanIndex>} scanIndex
 */
export function buildDiscoveryPinObjectEntries(pin, scanIndex) {
  const ids = Array.isArray(pin.object_ids) ? pin.object_ids.filter(Boolean) : [];
  /** @type {DiscoveryPinObjectEntry[]} */
  const entries = [];

  for (const objectId of ids) {
    const id = String(objectId ?? "").trim();
    if (!id) continue;
    const row = scanIndex.byObjectId.get(id) ?? null;
    const objectType =
      String(row?.object_type ?? "").trim() ||
      resolveNodeObjectType(row ?? {}) ||
      (ids.length === 1 ? String(pin.facets?.object_type ?? "").trim() : "");
    const label =
      String(row?.label ?? row?.public_label ?? pin.listing?.title ?? pin.display_label ?? id).trim() ||
      id;
    let scanUrl = null;
    if (typeof pin.scan_url === "string" && pin.scan_url.trim() && id === String(pin.primary_object_id ?? ids[0])) {
      scanUrl = pin.scan_url.trim();
    }
    if (!scanUrl && row && typeof row.scan_url === "string" && row.scan_url.trim()) {
      scanUrl = row.scan_url.trim();
    }
    entries.push({
      object_id: id,
      object_type: objectType,
      label,
      scan_url: scanUrl,
      network_ids: Array.isArray(pin.network_ids) ? [...pin.network_ids] : [],
    });
  }

  return entries;
}

/**
 * @param {DiscoveryPinObjectEntry[]} entries
 * @param {DiscoveryPin} pin
 * @param {{ activeNetworkId?: string | null; snapshotIndex?: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> }} [context]
 * @returns {string | null}
 */
export function resolveDiscoveryPrimaryObjectId(entries, pin, context = {}) {
  if (!entries.length) return null;
  if (entries.length === 1) return entries[0].object_id;

  const activeNetworkId = String(context.activeNetworkId ?? "").trim();
  const snapshotIndex = context.snapshotIndex ?? null;

  if (activeNetworkId) {
    const gameNode = entries.find(
      (entry) =>
        entry.object_type === "game_node" && entry.network_ids.includes(activeNetworkId)
    );
    if (gameNode) return gameNode.object_id;
  }

  for (const entry of entries) {
    const snap = snapshotIndex?.byObjectId?.get(entry.object_id) ?? null;
    if (!discoverySnapshotShowsCarePause(snap)) continue;
    if (entry.object_type === "status_plate" || entry.object_type === "resource_board") {
      return entry.object_id;
    }
  }

  for (const kind of PRIMARY_TYPE_PRECEDENCE) {
    const match = entries.find((entry) => entry.object_type === kind);
    if (match) return match.object_id;
  }

  if (String(pin.primary_object_id ?? "").trim()) {
    const pinned = entries.find((entry) => entry.object_id === pin.primary_object_id);
    if (pinned) return pinned.object_id;
  }

  return null;
}

/**
 * @param {DiscoveryPin} pin
 * @param {ReturnType<typeof import("./discovery-region-browse-core.mjs").buildSeasonNodeScanIndex>} scanIndex
 * @param {{ activeNetworkId?: string | null; snapshotIndex?: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> }} [context]
 */
export function resolveDiscoveryPinScanTargets(pin, scanIndex, context = {}) {
  const entries = buildDiscoveryPinObjectEntries(pin, scanIndex);
  const primaryObjectId = resolveDiscoveryPrimaryObjectId(entries, pin, context);
  const primaryEntry = primaryObjectId
    ? entries.find((entry) => entry.object_id === primaryObjectId) ?? null
    : null;
  return {
    entries,
    primaryObjectId,
    primaryScanUrl: primaryEntry?.scan_url ?? null,
    requiresChooser: entries.length > 1 && !primaryObjectId,
  };
}
