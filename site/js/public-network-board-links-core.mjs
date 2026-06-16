/**
 * Shareable board deep links on public network discovery cards.
 */
import { buildMapBoardSharePath } from "./city-game-map-interaction-core.mjs";

/** @typedef {{ label: string; href: string }} PublicNetworkBoardQuickLink */

/** @type {Record<string, Array<{ label: string; type?: string; state?: string; district?: string }>>} */
export const PUBLIC_NETWORK_BOARD_QUICK_LINK_SPECS = {
  cr_season_01_wake: [
    { label: "Faction relays", type: "relay_gate" },
    { label: "Sanctuaries", type: "sanctuary" },
    { label: "Hidden relays", type: "hidden" },
    { label: "NewBo relays", type: "relay_gate", district: "newbo" },
    { label: "River spine", district: "river_spine" },
  ],
};

/**
 * @param {string | null | undefined} boardPath
 * @param {string | null | undefined} seasonId
 * @returns {PublicNetworkBoardQuickLink[]}
 */
export function buildPublicNetworkBoardQuickLinks(boardPath, seasonId) {
  const path = String(boardPath ?? "").trim();
  const id = String(seasonId ?? "").trim();
  if (!path || !id) return [];

  const specs = PUBLIC_NETWORK_BOARD_QUICK_LINK_SPECS[id];
  if (!Array.isArray(specs) || !specs.length) return [];

  return specs.map((spec) => ({
    label: spec.label,
    href: buildMapBoardSharePath(path, {
      type: spec.type ?? "all",
      state: spec.state ?? "all",
      district: spec.district ?? "all",
    }),
  }));
}

/**
 * @param {PublicNetworkBoardQuickLink[]} links
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function renderPublicNetworkBoardQuickLinks(links, escapeHtml) {
  if (!Array.isArray(links) || !links.length) return "";
  const items = links
    .map(
      (link) =>
        `<a class="public-networks-card__board-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`
    )
    .join("");
  return `<div class="public-networks-card__board-links" data-state-first="related">${items}</div>`;
}
