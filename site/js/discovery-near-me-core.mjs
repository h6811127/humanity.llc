/**
 * Client-side near-me sort for DiscoveryPins — no server-side location storage.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-2
 */

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */
/** @typedef {{ latitude: number; longitude: number; accuracy?: number | null }} DiscoveryClientCoords */

export const DISCOVERY_NEAR_ME_PRIVACY_COPY =
  "Location is used on your device to sort results; scans are not tracked.";

export const DISCOVERY_NEAR_ME_PRIVACY_HREF = "/data-policy.html";

const EARTH_RADIUS_M = 6371008.8;

/**
 * @param {DiscoveryClientCoords} from
 * @param {{ latitude: number; longitude: number }} to
 */
export function haversineDistanceMeters(from, to) {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * @param {DiscoveryPin} pin
 */
export function discoveryPinHasGeo(pin) {
  const geo = pin.geo;
  return Boolean(
    geo &&
      Number.isFinite(geo.latitude) &&
      Number.isFinite(geo.longitude)
  );
}

/**
 * @param {number} meters
 */
export function formatDiscoveryNearMeDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Sort pins nearest-first. Pins without geo stay at the end in stable pin_id order.
 *
 * @param {DiscoveryPin[]} pins
 * @param {DiscoveryClientCoords} clientCoords
 */
export function sortDiscoveryPinsByNearMe(pins, clientCoords) {
  const withDistance = pins.map((pin) => {
    if (!discoveryPinHasGeo(pin)) {
      return { pin, distanceMeters: null };
    }
    const geo = /** @type {{ latitude: number; longitude: number }} */ (pin.geo);
    return {
      pin,
      distanceMeters: haversineDistanceMeters(clientCoords, geo),
    };
  });

  withDistance.sort((a, b) => {
    if (a.distanceMeters == null && b.distanceMeters == null) {
      return a.pin.pin_id.localeCompare(b.pin.pin_id);
    }
    if (a.distanceMeters == null) return 1;
    if (b.distanceMeters == null) return -1;
    if (a.distanceMeters !== b.distanceMeters) {
      return a.distanceMeters - b.distanceMeters;
    }
    return a.pin.pin_id.localeCompare(b.pin.pin_id);
  });

  /** @type {Map<string, number>} */
  const distancesByPinId = new Map();
  for (const row of withDistance) {
    if (row.distanceMeters != null) {
      distancesByPinId.set(row.pin.pin_id, row.distanceMeters);
    }
  }

  return {
    pins: withDistance.map((row) => row.pin),
    distancesByPinId,
  };
}

/**
 * @param {DiscoveryPin[]} pins
 */
export function countDiscoveryPinsWithGeo(pins) {
  return pins.filter((pin) => discoveryPinHasGeo(pin)).length;
}
