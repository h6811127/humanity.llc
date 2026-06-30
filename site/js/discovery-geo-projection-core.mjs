/**
 * Steward-published geo on DiscoveryPins — projection only, not scan-derived.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-2
 */
import {
  parseDiscoveryPublicListingFromRow,
  parseDiscoveryPublicListingGeo,
} from "./discovery-public-listing-core.mjs";

/** @typedef {import("./discovery-public-listing-core.mjs").DiscoveryPublicListingGeo} DiscoveryPublicListingGeo */

/**
 * Cedar Rapids pilot bounds — operator-published city envelope for schematic layout projection.
 * Not derived from scans or user location.
 */
export const CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS = {
  south: 41.944,
  north: 42.018,
  west: -91.718,
  east: -91.618,
};

/**
 * @param {number} x schematic 0–1
 * @param {number} y schematic 0–1
 * @param {typeof CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS} [bounds]
 * @returns {DiscoveryPublicListingGeo}
 */
export function schematicLayoutToDiscoveryGeo(x, y, bounds = CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS) {
  return {
    latitude: bounds.south + (1 - y) * (bounds.north - bounds.south),
    longitude: bounds.west + x * (bounds.east - bounds.west),
    precision: "block",
  };
}

/**
 * Resolve steward-published geo for a season registry node.
 * Precedence: object public_listing.geo → node.geo → season map_layout (pilot projection).
 *
 * @param {Record<string, unknown>} node
 * @param {Record<string, unknown>} [season]
 * @returns {DiscoveryPublicListingGeo | null}
 */
export function resolveDiscoveryGeoForSeasonNode(node, season) {
  const listingGeo = parseDiscoveryPublicListingFromRow(node).geo;
  if (listingGeo) return listingGeo;

  const nodeGeo = parseDiscoveryPublicListingGeo(node.geo);
  if (nodeGeo) return nodeGeo;

  const entryId = String(node.node_id ?? "").trim();
  if (!entryId || !season || typeof season !== "object") return null;

  const layout =
    season.map_layout && typeof season.map_layout === "object"
      ? /** @type {{ nodes?: Record<string, { x?: number; y?: number }> }} */ (
          season.map_layout
        )
      : null;
  const coords = layout?.nodes?.[entryId];
  const x = Number(coords?.x);
  const y = Number(coords?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;

  return schematicLayoutToDiscoveryGeo(x, y);
}
