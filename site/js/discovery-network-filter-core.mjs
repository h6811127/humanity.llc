/**
 * Discovery browse — client-side network lens filter on pins.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P3-2
 */
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";
import {
  discoveryRegionBrowsePath,
  resolveDiscoveryRegionSlugFromSeasonRow,
} from "./discovery-region-path-core.mjs";
import { escapeDiscoveryHtml } from "./discovery-region-browse-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

export const DISCOVERY_NETWORK_FILTER_ALL = "all";
export const DISCOVERY_NETWORK_FILTER_ALL_LABEL = "All places";

/**
 * @typedef {Object} DiscoveryNetworkFilterOption
 * @property {string} network_id
 * @property {string} label
 * @property {string | null} board_href
 */

/**
 * @param {string | null | undefined} search
 */
export function parseDiscoveryNetworkQuery(search) {
  const raw = String(search ?? "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const network = params.get("network")?.trim();
  return network || null;
}

/**
 * @param {string} region
 * @param {{ network?: string | null; pin?: string | null }} [state]
 */
export function buildDiscoveryBrowseQueryPath(region, state = {}) {
  const base = discoveryRegionBrowsePath(region);
  if (!base) return null;
  const params = new URLSearchParams();
  const network = String(state.network ?? "").trim();
  const pin = String(state.pin ?? "").trim();
  if (network && network !== DISCOVERY_NETWORK_FILTER_ALL) params.set("network", network);
  if (pin) params.set("pin", pin);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {string | null | undefined} networkId
 */
export function filterDiscoveryPinsByNetwork(pins, networkId) {
  const id = String(networkId ?? "").trim();
  if (!id || id === DISCOVERY_NETWORK_FILTER_ALL) return pins;
  return pins.filter((pin) => (pin.network_ids ?? []).includes(id));
}

/**
 * @param {string} region
 * @param {{ seasons?: Array<Record<string, unknown>> }} [seasonsIndex]
 * @param {DiscoveryPin[]} [pins]
 */
export function resolveDiscoveryNetworkOptionsForRegion(region, seasonsIndex, pins = []) {
  const slug = String(region ?? "").trim();
  /** @type {DiscoveryNetworkFilterOption[]} */
  const options = [];
  const networkIdsOnPins = new Set(
    pins.flatMap((pin) => (Array.isArray(pin.network_ids) ? pin.network_ids : [])).filter(Boolean)
  );

  for (const row of seasonsIndex?.seasons ?? []) {
    if (!row || typeof row !== "object") continue;
    const rowSlug = resolveDiscoveryRegionSlugFromSeasonRow(row);
    if (rowSlug !== slug) continue;
    const seasonId = String(row.season_id ?? "").trim();
    if (!seasonId || !networkIdsOnPins.has(seasonId)) continue;
    const listing =
      row.public_listing && typeof row.public_listing === "object"
        ? /** @type {Record<string, unknown>} */ (row.public_listing)
        : null;
    if (listing?.listed !== true) continue;
    options.push({
      network_id: seasonId,
      label: String(listing.title ?? row.title ?? seasonId).trim() || seasonId,
      board_href: seasonBoardPath(String(row.rules_path ?? "")),
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * @param {DiscoveryNetworkFilterOption[]} options
 * @param {string | null | undefined} activeNetworkId
 */
export function renderDiscoveryNetworkFilterChips(options, activeNetworkId) {
  const active = String(activeNetworkId ?? DISCOVERY_NETWORK_FILTER_ALL).trim() || DISCOVERY_NETWORK_FILTER_ALL;
  const allPressed = active === DISCOVERY_NETWORK_FILTER_ALL ? "true" : "false";
  const chips = [
    `<button type="button" class="discovery-network-filter-btn" data-network-filter="${DISCOVERY_NETWORK_FILTER_ALL}" aria-pressed="${allPressed}">${escapeDiscoveryHtml(DISCOVERY_NETWORK_FILTER_ALL_LABEL)}</button>`,
    ...options.map((opt) => {
      const pressed = active === opt.network_id ? "true" : "false";
      return `<button type="button" class="discovery-network-filter-btn" data-network-filter="${escapeDiscoveryHtml(opt.network_id)}" aria-pressed="${pressed}">${escapeDiscoveryHtml(opt.label)}</button>`;
    }),
  ];
  return `<div class="discovery-network-filter" role="group" aria-label="Filter places by network">${chips.join("")}</div>`;
}

/**
 * @param {DiscoveryNetworkFilterOption[]} options
 * @param {string | null | undefined} activeNetworkId
 */
export function resolveDiscoveryNetworkBoardHref(options, activeNetworkId) {
  const active = String(activeNetworkId ?? "").trim();
  if (!active || active === DISCOVERY_NETWORK_FILTER_ALL) {
    return options[0]?.board_href ?? null;
  }
  return options.find((opt) => opt.network_id === active)?.board_href ?? options[0]?.board_href ?? null;
}
