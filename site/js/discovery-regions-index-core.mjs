/**
 * Discovery region hub — listed regions from seasons index.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P3-1
 */
import {
  discoveryRegionBrowsePath,
  resolveDiscoveryRegionSlugFromSeasonRow,
} from "./discovery-region-path-core.mjs";
import { DISCOVERY_BROWSE_PLACES_CTA, escapeDiscoveryHtml } from "./discovery-region-browse-core.mjs";

/**
 * @typedef {Object} DiscoveryRegionHubEntry
 * @property {string} region_slug
 * @property {string} browse_href
 * @property {string} label
 * @property {string} city
 * @property {string} summary
 * @property {string} season_id
 * @property {string} network_display_name
 * @property {string | null} rules_path
 */

/**
 * @param {{ seasons?: Array<Record<string, unknown>> }} [seasonsIndex]
 * @returns {DiscoveryRegionHubEntry[]}
 */
export function buildDiscoveryRegionsFromSeasonsIndex(seasonsIndex) {
  /** @type {DiscoveryRegionHubEntry[]} */
  const regions = [];
  const seen = new Set();

  for (const row of seasonsIndex?.seasons ?? []) {
    if (!row || typeof row !== "object") continue;
    const listing =
      row.public_listing && typeof row.public_listing === "object"
        ? /** @type {Record<string, unknown>} */ (row.public_listing)
        : null;
    if (listing?.listed !== true) continue;

    const slug = resolveDiscoveryRegionSlugFromSeasonRow(row);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const browseHref = discoveryRegionBrowsePath(slug);
    if (!browseHref) continue;

    const networkName = String(listing.title ?? row.title ?? "").trim();
    regions.push({
      region_slug: slug,
      browse_href: browseHref,
      label: networkName || String(row.city ?? slug).trim(),
      city: String(row.city ?? "").trim(),
      summary: String(listing.summary ?? "").trim(),
      season_id: String(row.season_id ?? "").trim(),
      network_display_name: networkName,
      rules_path: String(row.rules_path ?? "").trim() || null,
    });
  }

  return regions.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * @param {DiscoveryRegionHubEntry[]} regions
 */
export function renderDiscoveryRegionsHubCards(regions) {
  if (!regions.length) {
    return `<p class="discovery-region-empty">No listed discovery regions yet.</p>`;
  }
  return regions
    .map((region) => {
      const meta = [region.city].filter(Boolean).join(" · ");
      const summary = region.summary
        ? `<p class="discovery-region-card__summary">${escapeDiscoveryHtml(region.summary)}</p>`
        : "";
      return `<article class="discovery-region-card hc-emphasis-card hc-emphasis-card--info">
  <div class="discovery-region-card__copy">
    <p class="hc-emphasis-card__eyebrow">Discovery region</p>
    <h2 class="discovery-region-card__title"><a class="discovery-region-card__link" href="${escapeDiscoveryHtml(region.browse_href)}">${escapeDiscoveryHtml(region.label)}</a></h2>
    ${meta ? `<p class="discovery-region-card__meta">${escapeDiscoveryHtml(meta)}</p>` : ""}
    ${summary}
  </div>
  <div class="hc-emphasis-card__actions">
    <a class="hc-emphasis-card__cta" href="${escapeDiscoveryHtml(region.browse_href)}">${escapeDiscoveryHtml(DISCOVERY_BROWSE_PLACES_CTA)}</a>
  </div>
</article>`;
    })
    .join("");
}
