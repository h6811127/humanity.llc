/**
 * DiscoveryPin projection — derived browse index, not resolver truth.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P0
 */

/** @typedef {{ listed?: boolean; title?: string | null; summary?: string | null; category?: string | null }} DiscoveryListingFacet */

/**
 * @typedef {Object} DiscoveryPinFacets
 * @property {string} [object_type]
 * @property {string} [role]
 * @property {string} [district]
 * @property {string} [category]
 * @property {string} [entry_id]
 */

/**
 * @typedef {Object} DiscoveryPin
 * @property {string} pin_id
 * @property {string} region
 * @property {string} display_label
 * @property {string[]} object_ids
 * @property {string[]} [network_ids]
 * @property {string} [primary_object_id]
 * @property {DiscoveryPinFacets} facets
 * @property {DiscoveryListingFacet} listing
 * @property {string} index_version
 */

/**
 * @typedef {Object} DiscoveryPinIndex
 * @property {string} region
 * @property {string} index_version
 * @property {string} generated_at
 * @property {DiscoveryPin[]} pins
 */

export const DISCOVERY_PIN_INDEX_VERSION = "discovery-pin-v1";

export const DISCOVERY_INDEXABLE_OBJECT_TYPES = new Set([
  "game_node",
  "status_plate",
  "menu_board",
  "resource_board",
]);

export const DISCOVERY_EXCLUDED_OBJECT_TYPES = new Set([
  "lost_item_relay",
  "print_artifact",
]);

export const DISCOVERY_EXCLUDED_ROLES = new Set(["mobile_lore"]);

export const DEFAULT_DISCOVERY_REGION = "cedar-rapids-iowa";

/**
 * @param {string} value
 */
export function slugifyDiscoveryRegion(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveDiscoveryRegionFromSeason(season) {
  const listing =
    season.public_listing && typeof season.public_listing === "object"
      ? /** @type {{ region?: string }} */ (season.public_listing)
      : null;
  const fromListing = slugifyDiscoveryRegion(listing?.region ?? "");
  if (fromListing) return fromListing;
  const fromCity = slugifyDiscoveryRegion(String(season.city ?? ""));
  return fromCity || DEFAULT_DISCOVERY_REGION;
}

/**
 * @param {Record<string, unknown>} season
 */
export function discoveryPinIndexRelForSeason(season) {
  const region = resolveDiscoveryRegionFromSeason(season);
  return `/data/discovery-${region}.json`;
}

/**
 * Repo-relative path for committed pin index JSON.
 * @param {Record<string, unknown>} season
 */
export function discoveryPinIndexSitePath(season) {
  const region = resolveDiscoveryRegionFromSeason(season);
  return `site/data/discovery-${region}.json`;
}

/**
 * @param {Record<string, unknown>} node
 * @param {string} region
 */
export function stablePinIdFromNode(node, region) {
  const entryId = String(node.node_id ?? "").trim();
  return `pin_${region}_${entryId}`.replace(/[^a-z0-9_-]+/gi, "_");
}

/**
 * @param {Record<string, unknown>} node
 */
export function resolveNodeObjectType(node) {
  const explicit = String(node.object_type ?? "").trim();
  if (explicit) return explicit;
  if (node.node_id && node.role) return "game_node";
  return "";
}

/**
 * @param {Record<string, unknown>} node
 * @param {{ seasonListed?: boolean; objectListed?: boolean; status?: string }} [opts]
 */
export function isNodeDiscoveryIndexable(node, opts = {}) {
  const objectType = resolveNodeObjectType(node);
  if (!objectType || !DISCOVERY_INDEXABLE_OBJECT_TYPES.has(objectType)) return false;
  if (DISCOVERY_EXCLUDED_OBJECT_TYPES.has(objectType)) return false;
  const role = String(node.role ?? "").trim();
  if (role && DISCOVERY_EXCLUDED_ROLES.has(role)) return false;
  const status = String(opts.status ?? node.status ?? "active").trim().toLowerCase();
  if (status === "revoked" || status === "disabled") return false;
  const objectListed = opts.objectListed ?? node.public_listing?.listed !== false;
  if (!objectListed) return false;
  const label = String(node.label ?? "").trim();
  const objectId = String(node.object_id ?? "").trim();
  if (!label && !objectId) return false;
  return true;
}

/**
 * @param {DiscoveryPin} pin
 * @param {{ networkId?: string | null }} [opts]
 */
export function selectPrimaryObjectId(pin, opts = {}) {
  const ids = Array.isArray(pin.object_ids) ? pin.object_ids.filter(Boolean) : [];
  if (!ids.length) return null;
  if (ids.length === 1) return ids[0];

  const networkId = String(opts.networkId ?? "").trim();
  if (networkId && (pin.network_ids ?? []).includes(networkId)) {
    if (pin.facets?.object_type === "game_node") return ids[0];
  }

  const precedence = ["status_plate", "menu_board", "game_node"];
  for (const kind of precedence) {
    if (pin.facets?.object_type === kind) return ids[0];
  }
  return null;
}

/**
 * @param {Record<string, unknown>} node
 * @param {string} region
 * @param {string} indexVersion
 * @param {{ networkIds?: string[]; seasonListed?: boolean }} [opts]
 * @returns {DiscoveryPin | null}
 */
export function projectDiscoveryPinFromSeasonNode(node, region, indexVersion, opts = {}) {
  if (!isNodeDiscoveryIndexable(node)) return null;

  const entryId = String(node.node_id ?? "").trim();
  const objectId = String(node.object_id ?? "").trim();
  const objectIds = objectId ? [objectId] : [];
  if (!entryId || !objectIds.length) return null;

  const seasonListed = opts.seasonListed === true;
  const networkIds =
    seasonListed && Array.isArray(opts.networkIds) ? opts.networkIds.filter(Boolean) : [];
  /** @type {DiscoveryPin} */
  const pin = {
    pin_id: stablePinIdFromNode(node, region),
    region,
    display_label: String(node.label ?? entryId).trim(),
    object_ids: objectIds,
    facets: {
      object_type: resolveNodeObjectType(node),
      role: String(node.role ?? "").trim() || undefined,
      district: String(node.district ?? "").trim() || undefined,
      category: String(node.role ?? "").trim() || undefined,
      entry_id: entryId,
    },
    listing: {
      listed: opts.seasonListed !== false,
      title: String(node.label ?? entryId).trim(),
      category: "game_node",
    },
    index_version: indexVersion,
  };
  if (networkIds.length) pin.network_ids = [...networkIds];
  pin.primary_object_id = selectPrimaryObjectId(pin, {
    networkId: networkIds[0] ?? null,
  }) ?? objectIds[0];
  return pin;
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {string} networkId
 */
export function filterDiscoveryPinsByNetworkLens(pins, networkId) {
  const id = String(networkId ?? "").trim();
  if (!id) return pins;
  return pins.filter((pin) => (pin.network_ids ?? []).includes(id));
}

/**
 * Stable fingerprint for rebuild idempotency (excludes generated_at).
 * @param {DiscoveryPin[]} pins
 * @param {string} region
 */
export function fingerprintDiscoveryPinIndex(pins, region) {
  const rows = [...pins]
    .sort((a, b) => a.pin_id.localeCompare(b.pin_id))
    .map((pin) => ({
      pin_id: pin.pin_id,
      region: pin.region,
      display_label: pin.display_label,
      object_ids: [...pin.object_ids].sort(),
      network_ids: [...(pin.network_ids ?? [])].sort(),
      primary_object_id: pin.primary_object_id ?? null,
      facets: pin.facets,
      listing: pin.listing,
    }));
  return `${DISCOVERY_PIN_INDEX_VERSION}:${region}:${JSON.stringify(rows)}`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ generatedAt?: string; region?: string }} [opts]
 * @returns {DiscoveryPinIndex}
 */
export function projectDiscoveryPinIndexFromSeason(season, opts = {}) {
  const region = opts.region?.trim() || resolveDiscoveryRegionFromSeason(season);
  const seasonId = String(season.season_id ?? "").trim();
  const listing =
    season.public_listing && typeof season.public_listing === "object"
      ? /** @type {{ listed?: boolean }} */ (season.public_listing)
      : null;
  const seasonListed = listing?.listed === true;
  const networkIds = seasonListed && seasonId ? [seasonId] : [];
  const nodes = Array.isArray(season.nodes) ? season.nodes : [];

  const pins = nodes
    .map((node) =>
      projectDiscoveryPinFromSeasonNode(
        /** @type {Record<string, unknown>} */ (node),
        region,
        DISCOVERY_PIN_INDEX_VERSION,
        { networkIds, seasonListed }
      )
    )
    .filter(Boolean);

  const indexVersion = fingerprintDiscoveryPinIndex(
    /** @type {DiscoveryPin[]} */ (pins),
    region
  );

  for (const pin of pins) {
    pin.index_version = indexVersion;
  }

  return {
    region,
    index_version: indexVersion,
    generated_at: opts.generatedAt ?? new Date().toISOString(),
    pins: /** @type {DiscoveryPin[]} */ (pins),
  };
}

/**
 * @param {DiscoveryPinIndex | null | undefined} index
 * @param {string} networkId
 */
export function discoveryPinsForNetworkLens(index, networkId) {
  if (!index?.pins?.length) return [];
  return filterDiscoveryPinsByNetworkLens(index.pins, networkId);
}

/**
 * Guard — pins must never carry geo or player/visit fields in P0.
 * @param {DiscoveryPin} pin
 */
export function assertDiscoveryPinPrivacyShape(pin) {
  const forbidden = ["geo", "latitude", "longitude", "visit", "player_id", "scan_count"];
  for (const key of forbidden) {
    if (key in pin) throw new Error(`DiscoveryPin must not include ${key}`);
  }
}
