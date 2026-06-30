/**
 * Player discovery flow — breadcrumbs and shared nav labels (shell only).
 */
import {
  PUBLIC_NETWORKS_CATALOG_LABEL,
  PUBLIC_NETWORKS_CATALOG_PATH,
  PUBLIC_NETWORK_OPEN_BOARD_CTA,
  PUBLIC_NETWORK_RULES_PROVE_CTA,
  publicNetworkRulesProveHref,
} from "./public-networks-portal-core.mjs";
import { DISCOVERY_MAP_BROWSE_NEAR_ME_CTA } from "./discovery-map-crosslink-core.mjs";
import { discoveryRegionBrowsePath } from "./discovery-region-path-core.mjs";

export const PLAYER_FLOW_HOME_LABEL = "Home";
export const PLAYER_FLOW_NETWORKS_LABEL = "Public networks";

/**
 * @param {string} value
 */
export function escapePlayerFlowHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Array<{ href?: string; label: string; current?: boolean }>} items
 * @param {(value: string) => string} [escapeHtml]
 */
export function renderPlayerFlowBreadcrumb(items, escapeHtml = escapePlayerFlowHtml) {
  const parts = items.map((item) => {
    if (item.current) {
      return `<span aria-current="page">${escapeHtml(item.label)}</span>`;
    }
    const href = String(item.href ?? "").trim();
    if (!href) return escapeHtml(item.label);
    return `<a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a>`;
  });
  return `<nav class="player-flow-breadcrumb" aria-label="You are here">${parts.join(
    '<span class="player-flow-breadcrumb-sep" aria-hidden="true"> · </span>'
  )}</nav>`;
}

/**
 * @param {string} boardTitle e.g. Wake the city
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildPlayerFlowMapBreadcrumbHtml(boardTitle, escapeHtml = escapePlayerFlowHtml) {
  const title = String(boardTitle ?? "").trim() || "Board";
  return renderPlayerFlowBreadcrumb(
    [
      { href: "/", label: PLAYER_FLOW_HOME_LABEL },
      { href: PUBLIC_NETWORKS_CATALOG_PATH, label: PLAYER_FLOW_NETWORKS_LABEL },
      { label: `${title} board`, current: true },
    ],
    escapeHtml
  );
}

/**
 * @param {string} networkTitle
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildPlayerFlowRulesBreadcrumbHtml(networkTitle, escapeHtml = escapePlayerFlowHtml) {
  const title = String(networkTitle ?? "").trim() || "Network";
  return renderPlayerFlowBreadcrumb(
    [
      { href: "/", label: PLAYER_FLOW_HOME_LABEL },
      { href: PUBLIC_NETWORKS_CATALOG_PATH, label: PLAYER_FLOW_NETWORKS_LABEL },
      { label: title, current: true },
    ],
    escapeHtml
  );
}

/**
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildPlayerFlowCatalogBreadcrumbHtml(escapeHtml = escapePlayerFlowHtml) {
  return renderPlayerFlowBreadcrumb(
    [
      { href: "/", label: PLAYER_FLOW_HOME_LABEL },
      { label: PLAYER_FLOW_NETWORKS_LABEL, current: true },
    ],
    escapeHtml
  );
}

/**
 * @param {string} regionLabel
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildPlayerFlowDiscoverRegionBreadcrumbHtml(
  regionLabel,
  escapeHtml = escapePlayerFlowHtml
) {
  const label = String(regionLabel ?? "").trim() || "Region";
  return renderPlayerFlowBreadcrumb(
    [
      { href: "/", label: PLAYER_FLOW_HOME_LABEL },
      { href: PUBLIC_NETWORKS_CATALOG_PATH, label: PLAYER_FLOW_NETWORKS_LABEL },
      { href: "/discover/", label: "Browse places" },
      { label, current: true },
    ],
    escapeHtml
  );
}

/**
 * @param {{ boardHref: string; rulesPath: string; discoverHref?: string | null }} links
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildDiscoverRegionPlayerFootnoteHtml(links, escapeHtml = escapePlayerFlowHtml) {
  const rulesProve = publicNetworkRulesProveHref(links.rulesPath);
  const segments = [
    `<a href="${escapeHtml(links.boardHref)}">${escapeHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)}</a>`,
    rulesProve
      ? `<a href="${escapeHtml(rulesProve)}">What a scan proves</a>`
      : "",
    `<a href="${escapeHtml(PUBLIC_NETWORKS_CATALOG_PATH)}">${escapeHtml(PUBLIC_NETWORKS_CATALOG_LABEL)}</a>`,
    `<a href="/discover/">All regions</a>`,
    `<a href="/">Home dashboard</a>`,
  ].filter(Boolean);
  return `<p class="idea-footnote discovery-region-player-footnote">${segments.join("\n          ·\n          ")}</p>`;
}

/**
 * Resolve discover browse href for a season config (public_listing.region or city).
 * @param {Record<string, unknown>} season
 */
export function resolveSeasonDiscoveryBrowseHref(season) {
  const listing =
    season?.public_listing && typeof season.public_listing === "object"
      ? /** @type {{ region?: string }} */ (season.public_listing)
      : null;
  const region = String(listing?.region ?? "").trim();
  const city = String(season?.city ?? "").trim();
  return discoveryRegionBrowsePath(region || city);
}

/**
 * Map shell footnote — discover browse (when region known) + rules anchors + catalog.
 * @param {Record<string, unknown>} season
 * @param {string} rulesPath
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildMapPagePlayerFootnoteHtml(season, rulesPath, escapeHtml = escapePlayerFlowHtml) {
  const rules = String(rulesPath ?? "").trim() || "/play/season/";
  const discoverHref = resolveSeasonDiscoveryBrowseHref(season);
  const segments = [
    discoverHref
      ? `<a href="${escapeHtml(discoverHref)}">${escapeHtml(DISCOVERY_MAP_BROWSE_NEAR_ME_CTA)}</a>`
      : "",
    `<a href="${escapeHtml(rules)}#rules-start-title">How this network works</a>`,
    `<a href="${escapeHtml(rules)}#rules-privacy-title">Privacy &amp; mechanics</a>`,
    `<a href="${escapeHtml(PUBLIC_NETWORKS_CATALOG_PATH)}">${escapeHtml(PUBLIC_NETWORKS_CATALOG_LABEL)}</a>`,
    `<a href="/data-policy.html">Data policy</a>`,
  ].filter(Boolean);
  return `<p class="idea-footnote city-game-map-page-footnote">${segments.join("\n          ·\n          ")}</p>`;
}

/**
 * Rules charter footnote — board + discover + catalog + home (+ optional operator links).
 * @param {Record<string, unknown>} season
 * @param {{ boardPath: string; rulesPath: string; teachingPath?: string | null; debriefPath?: string | null; fieldWalkPath?: string | null }} links
 * @param {(value: string) => string} [escapeHtml]
 */
export function buildRulesPagePlayerFootnoteHtml(season, links, escapeHtml = escapePlayerFlowHtml) {
  const boardHref = String(links.boardPath ?? "").trim();
  const rulesPath = String(links.rulesPath ?? "").trim();
  const rulesProve = rulesPath ? publicNetworkRulesProveHref(rulesPath) : "";
  const discoverHref = resolveSeasonDiscoveryBrowseHref(season);
  const teachingHref = String(links.teachingPath ?? "").trim();
  const debriefHref = String(links.debriefPath ?? "").trim();
  const fieldWalkHref = String(links.fieldWalkPath ?? "").trim();
  const segments = [
    boardHref
      ? `<a href="${escapeHtml(boardHref)}">${escapeHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)}</a>`
      : "",
    rulesProve
      ? `<a href="${escapeHtml(rulesProve)}">${escapeHtml(PUBLIC_NETWORK_RULES_PROVE_CTA)}</a>`
      : "",
    discoverHref
      ? `<a href="${escapeHtml(discoverHref)}">${escapeHtml(DISCOVERY_MAP_BROWSE_NEAR_ME_CTA)}</a>`
      : "",
    `<a href="${escapeHtml(PUBLIC_NETWORKS_CATALOG_PATH)}">${escapeHtml(PUBLIC_NETWORKS_CATALOG_LABEL)}</a>`,
    `<a href="/">Home dashboard</a>`,
    teachingHref
      ? `<a href="${escapeHtml(teachingHref)}">LO-4 teaching kit</a> (operators)`
      : "",
    fieldWalkHref
      ? `<a href="${escapeHtml(fieldWalkHref)}">Player flow field walk</a> (operators)`
      : "",
    debriefHref ? `<a href="${escapeHtml(debriefHref)}">Season debrief</a> (after close)` : "",
  ].filter(Boolean);
  return `<p class="idea-footnote city-game-rules-player-footnote">${segments.join("\n          ·\n          ")}</p>`;
}
