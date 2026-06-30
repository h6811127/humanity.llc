/**
 * Standalone discovery objects — listed resolver rows outside season node registry.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-6
 */
import {
  discoveryListingDisplayTitle,
  isObjectListedForDiscovery,
  parseDiscoveryPublicListingFromRow,
} from "./discovery-public-listing-core.mjs";
import {
  DISCOVERY_EXCLUDED_OBJECT_TYPES,
  DISCOVERY_EXCLUDED_ROLES,
  DISCOVERY_INDEXABLE_OBJECT_TYPES,
  selectPrimaryObjectId,
  slugifyDiscoveryRegion,
} from "./discovery-pin-projection-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

/**
 * @param {string} region
 */
export function discoveryStandaloneObjectsSitePath(region) {
  const slug = slugifyDiscoveryRegion(region);
  return slug ? `site/data/discovery-standalone-${slug}.json` : null;
}

/**
 * @param {string} region
 */
export function discoveryStandaloneObjectsRelPath(region) {
  const slug = slugifyDiscoveryRegion(region);
  return slug ? `/data/discovery-standalone-${slug}.json` : null;
}

/**
 * @param {string} objectId
 * @param {string} region
 */
export function stablePinIdFromStandaloneObject(objectId, region) {
  const id = String(objectId ?? "")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "_");
  return `pin_${region}_obj_${id}`;
}

/**
 * @param {Record<string, unknown>} row
 */
export function resolveStandaloneObjectType(row) {
  return String(row.object_type ?? "").trim();
}

/**
 * @param {Record<string, unknown>} row
 */
export function isStandaloneObjectDiscoveryIndexable(row) {
  const objectType = resolveStandaloneObjectType(row);
  if (!objectType || !DISCOVERY_INDEXABLE_OBJECT_TYPES.has(objectType)) return false;
  if (DISCOVERY_EXCLUDED_OBJECT_TYPES.has(objectType)) return false;
  const role = String(row.role ?? "").trim();
  if (role && DISCOVERY_EXCLUDED_ROLES.has(role)) return false;
  const status = String(row.status ?? "active").trim().toLowerCase();
  if (status === "revoked" || status === "disabled") return false;
  if (!isObjectListedForDiscovery(row, { onSeasonRegistry: false, seasonListed: false })) {
    return false;
  }
  const objectId = String(row.object_id ?? "").trim();
  const label = String(row.label ?? "").trim();
  if (!objectId) return false;
  if (!label && !parseDiscoveryPublicListingFromRow(row).title) return false;
  const scanUrl = String(row.scan_url ?? "").trim();
  if (!scanUrl) return false;
  return true;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} region
 * @param {string} indexVersion
 * @returns {DiscoveryPin | null}
 */
export function projectDiscoveryPinFromStandaloneObject(row, region, indexVersion) {
  if (!isStandaloneObjectDiscoveryIndexable(row)) return null;

  const objectId = String(row.object_id ?? "").trim();
  const objectListing = parseDiscoveryPublicListingFromRow(row);
  const fallbackLabel = String(row.label ?? objectId).trim();
  const displayLabel =
    discoveryListingDisplayTitle(objectListing, fallbackLabel) ?? fallbackLabel;
  const scanUrl = String(row.scan_url ?? "").trim();
  const objectType = resolveStandaloneObjectType(row);
  const district = String(row.district ?? "").trim() || undefined;

  /** @type {DiscoveryPin} */
  const pin = {
    pin_id: stablePinIdFromStandaloneObject(objectId, region),
    region,
    display_label: displayLabel,
    object_ids: [objectId],
    facets: {
      object_type: objectType,
      role: String(row.role ?? "").trim() || undefined,
      district,
      category: objectListing.category ?? objectType,
    },
    listing: {
      listed: true,
      title: displayLabel,
      summary: objectListing.summary ?? undefined,
      category: objectListing.category ?? objectType,
    },
    scan_url: scanUrl,
    index_version: indexVersion,
  };
  if (objectListing.geo) pin.geo = objectListing.geo;
  pin.primary_object_id = selectPrimaryObjectId(pin) ?? objectId;
  return pin;
}

/**
 * @param {unknown} raw
 * @returns {{ region: string; objects: Record<string, unknown>[] }}
 */
export function parseDiscoveryStandaloneObjectsManifest(raw) {
  if (!raw || typeof raw !== "object") {
    return { region: "", objects: [] };
  }
  const manifest = /** @type {Record<string, unknown>} */ (raw);
  const region = slugifyDiscoveryRegion(String(manifest.region ?? ""));
  const objects = Array.isArray(manifest.objects)
    ? manifest.objects.filter((row) => row && typeof row === "object")
    : [];
  return {
    region,
    objects: /** @type {Record<string, unknown>[]} */ (objects),
  };
}

/**
 * Season registry pins win when object_id collides.
 * @param {DiscoveryPin[]} seasonPins
 * @param {DiscoveryPin[]} standalonePins
 */
export function mergeStandaloneDiscoveryPins(seasonPins, standalonePins) {
  const usedObjectIds = new Set(
    seasonPins.flatMap((pin) => pin.object_ids ?? []).filter(Boolean)
  );
  const merged = [...seasonPins];
  for (const pin of standalonePins) {
    const objectId = pin.object_ids?.[0];
    if (!objectId || usedObjectIds.has(objectId)) continue;
    usedObjectIds.add(objectId);
    merged.push(pin);
  }
  return merged;
}

/**
 * @param {Record<string, unknown>[]} objects
 * @param {string} region
 * @param {string} indexVersion
 */
export function projectDiscoveryPinsFromStandaloneObjects(objects, region, indexVersion) {
  return objects
    .map((row) => projectDiscoveryPinFromStandaloneObject(row, region, indexVersion))
    .filter(Boolean);
}
