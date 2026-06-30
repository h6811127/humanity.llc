/**
 * Discovery region browse — pin rows, detail panel, season scan lookup.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-3
 */
import {
  discoveryPinBrowseQueryPath,
  discoveryRegionBrowsePath,
} from "./discovery-region-path-core.mjs";
import {
  DISCOVERY_NEAR_ME_PRIVACY_COPY,
  DISCOVERY_NEAR_ME_PRIVACY_HREF,
  formatDiscoveryNearMeDistance,
} from "./discovery-near-me-core.mjs";
import { resolveDiscoveryPinScanTargets } from "./discovery-primary-object-core.mjs";
import { DISCOVERY_MAP_BROWSE_NEAR_ME_CTA } from "./discovery-map-crosslink-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

/** Portal + map footnote label — matches network lens discover crosslink. */
export const DISCOVERY_BROWSE_PLACES_CTA = DISCOVERY_MAP_BROWSE_NEAR_ME_CTA;
export const DISCOVERY_NEAR_ME_BUTTON_LABEL = "Sort near me";
export const DISCOVERY_OPEN_LIVE_SCAN_CTA = "Open live scan";
export const DISCOVERY_BACK_TO_BROWSE_CTA = "All places in this region";

/**
 * @param {string} value
 */
export function escapeDiscoveryHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string | null | undefined} district
 */
export function formatDiscoveryDistrictLabel(district) {
  const raw = String(district ?? "").trim();
  if (!raw) return "";
  return raw.replace(/_/g, " ");
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildSeasonNodeScanIndex(season) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byEntryId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const byObjectId = new Map();
  for (const node of Array.isArray(season.nodes) ? season.nodes : []) {
    if (!node || typeof node !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (node);
    const entryId = String(row.node_id ?? "").trim();
    const objectId = String(row.object_id ?? "").trim();
    if (entryId) byEntryId.set(entryId, row);
    if (objectId) byObjectId.set(objectId, row);
  }
  return { byEntryId, byObjectId };
}

/**
 * @param {DiscoveryPin} pin
 * @param {ReturnType<typeof buildSeasonNodeScanIndex>} index
 */
export function resolveScanUrlForPin(pin, index, context = {}) {
  const direct = String(pin.scan_url ?? "").trim();
  if (direct && (pin.object_ids?.length ?? 0) <= 1) return direct;

  const targets = resolveDiscoveryPinScanTargets(pin, index, context);
  if (targets.primaryScanUrl) return targets.primaryScanUrl;

  const entryId = String(pin.facets?.entry_id ?? "").trim();
  if (entryId && index.byEntryId.has(entryId)) {
    const scanUrl = index.byEntryId.get(entryId)?.scan_url;
    if (typeof scanUrl === "string" && scanUrl.trim()) return scanUrl.trim();
  }

  if (direct) return direct;

  const primary = String(targets.primaryObjectId ?? pin.primary_object_id ?? pin.object_ids?.[0] ?? "").trim();
  if (primary && index.byObjectId.has(primary)) {
    const scanUrl = index.byObjectId.get(primary)?.scan_url;
    if (typeof scanUrl === "string" && scanUrl.trim()) return scanUrl.trim();
  }
  return null;
}

/**
 * @param {DiscoveryPinObjectEntry[]} entries
 * @param {string | null | undefined} primaryObjectId
 */
export function renderDiscoveryPinObjectChooser(entries, primaryObjectId) {
  if (entries.length <= 1) return "";
  const primary = String(primaryObjectId ?? "").trim();
  const items = entries
    .map((entry) => {
      const scanUrl = entry.scan_url;
      const isPrimary = primary && entry.object_id === primary;
      const typeLabel = entry.object_type ? entry.object_type.replace(/_/g, " ") : "object";
      const body = scanUrl
        ? `<a class="discovery-pin-object-chooser__link" href="${escapeDiscoveryHtml(scanUrl)}">${escapeDiscoveryHtml(entry.label)}</a>`
        : `<span class="discovery-pin-object-chooser__label">${escapeDiscoveryHtml(entry.label)}</span>`;
      return `<li class="discovery-pin-object-chooser__item${isPrimary ? " discovery-pin-object-chooser__item--primary" : ""}">
  ${body}
  <span class="discovery-pin-object-chooser__type">${escapeDiscoveryHtml(typeLabel)}</span>
</li>`;
    })
    .join("");
  const heading =
    entries.length > 1 && !primary
      ? "Choose which object to scan"
      : "Other objects at this place";
  return `<section class="discovery-pin-object-chooser" aria-label="Objects at this pin">
  <h2 class="discovery-pin-object-chooser__title">${escapeDiscoveryHtml(heading)}</h2>
  <ul class="discovery-pin-object-chooser__list">${items}</ul>
</section>`;
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {string} query
 */
export function filterDiscoveryPinsByQuery(pins, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return pins;
  return pins.filter((pin) => {
    const haystack = [
      pin.display_label,
      pin.facets?.district,
      pin.facets?.role,
      pin.facets?.category,
      pin.listing?.title,
      pin.listing?.summary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * @param {DiscoveryPin[]} pins
 */
export function sortDiscoveryPinsByLabel(pins) {
  return [...pins].sort((a, b) => a.display_label.localeCompare(b.display_label));
}

/**
 * @param {DiscoveryPin} pin
 * @param {{ region: string; distanceMeters?: number | null; scanUrl?: string | null; stateHeadline?: string | null }} ctx
 */
export function buildDiscoveryPinRowModel(pin, ctx) {
  const district = formatDiscoveryDistrictLabel(pin.facets?.district);
  const distanceLabel =
    ctx.distanceMeters != null ? formatDiscoveryNearMeDistance(ctx.distanceMeters) : "";
  const detailHref =
    ctx.detailHref ??
    (ctx.region
      ? discoveryPinBrowseQueryPath(ctx.region, pin.pin_id)
      : null);
  return {
    pin_id: pin.pin_id,
    title: pin.display_label,
    district,
    role: String(pin.facets?.role ?? "").trim(),
    distanceLabel,
    stateHeadline: String(ctx.stateHeadline ?? "").trim() || null,
    detailHref,
    scanUrl: ctx.scanUrl ?? null,
  };
}

/**
 * @param {ReturnType<typeof buildDiscoveryPinRowModel>[]} rows
 */
export function renderDiscoveryPinRows(rows) {
  if (!rows.length) {
    return `<p class="discovery-region-empty">No places match this search.</p>`;
  }
  return rows
    .map((row) => {
      const metaParts = [row.district, row.role?.replace(/_/g, " "), row.distanceLabel]
        .filter(Boolean)
        .join(" · ");
      const meta = metaParts
        ? `<p class="discovery-pin-row__meta">${escapeDiscoveryHtml(metaParts)}</p>`
        : "";
      const stateLine = row.stateHeadline
        ? `<p class="discovery-pin-row__state">${escapeDiscoveryHtml(row.stateHeadline)}</p>`
        : "";
      const detailHref = row.detailHref
        ? `<a class="discovery-pin-row__link" href="${escapeDiscoveryHtml(row.detailHref)}">${escapeDiscoveryHtml(row.title)}</a>`
        : `<span class="discovery-pin-row__title">${escapeDiscoveryHtml(row.title)}</span>`;
      return `<article class="discovery-pin-row hc-emphasis-card hc-emphasis-card--info discovery-pin-row--state-first" data-pin-id="${escapeDiscoveryHtml(row.pin_id)}">
  <div class="discovery-pin-row__main">
    <h2 class="discovery-pin-row__heading">${detailHref}</h2>
    ${stateLine}
    ${meta}
  </div>
</article>`;
    })
    .join("");
}

/**
 * @param {DiscoveryPin} pin
 * @param {{ region: string; scanUrl?: string | null; browseHref?: string | null; boardHref?: string | null; snapshotSectionHtml?: string | null }} ctx
 */
export function renderDiscoveryPinDetail(pin, ctx) {
  const district = formatDiscoveryDistrictLabel(pin.facets?.district);
  const summary = String(pin.listing?.summary ?? "").trim();
  const metaParts = [district, pin.facets?.role?.replace(/_/g, " ")].filter(Boolean);
  const snapshotSection = ctx.snapshotSectionHtml
    ? ctx.snapshotSectionHtml
    : "";
  const objectChooser = ctx.objectChooserHtml ?? "";
  const scanCta =
    ctx.scanUrl
      ? `<a class="hc-emphasis-card__cta discovery-pin-detail__cta" href="${escapeDiscoveryHtml(ctx.scanUrl)}">${escapeDiscoveryHtml(DISCOVERY_OPEN_LIVE_SCAN_CTA)}</a>`
      : ctx.requiresObjectChoice
        ? `<p class="discovery-pin-detail__scan-missing">Pick an object below — this place has more than one live scan target.</p>`
        : `<p class="discovery-pin-detail__scan-missing">Live scan link unavailable — open the city board or scan the sticker on site.</p>`;
  const browseHref = ctx.browseHref ?? discoveryRegionBrowsePath(ctx.region);
  const backLink = browseHref
    ? `<a class="discovery-pin-detail__back" href="${escapeDiscoveryHtml(browseHref)}">${escapeDiscoveryHtml(DISCOVERY_BACK_TO_BROWSE_CTA)}</a>`
    : "";
  const boardLink =
    ctx.boardHref
      ? `<a class="discovery-pin-detail__board" href="${escapeDiscoveryHtml(ctx.boardHref)}">Open network board</a>`
      : "";
  return `<article class="discovery-pin-detail hc-emphasis-card hc-emphasis-card--info">
  <div class="discovery-pin-detail__copy">
    <p class="hc-emphasis-card__eyebrow">Discovery pin · ${escapeDiscoveryHtml(ctx.region.replace(/-/g, " "))}</p>
    <h1 class="hc-emphasis-card__title">${escapeDiscoveryHtml(pin.display_label)}</h1>
    ${
      metaParts.length
        ? `<p class="hc-emphasis-card__detail">${escapeDiscoveryHtml(metaParts.join(" · "))}</p>`
        : ""
    }
    ${
      summary
        ? `<p class="discovery-pin-detail__summary">${escapeDiscoveryHtml(summary)}</p>`
        : ""
    }
  </div>
  ${snapshotSection}
  ${objectChooser}
  <div class="hc-emphasis-card__actions discovery-pin-detail__actions">
    ${scanCta}
  </div>
  <p class="discovery-pin-detail__links">${backLink}${boardLink ? `${backLink ? " · " : ""}${boardLink}` : ""}</p>
</article>`;
}

/**
 * @param {{ href?: string }} [opts]
 */
export function renderDiscoveryNearMePrivacyNotice(opts = {}) {
  const href = opts.href ?? DISCOVERY_NEAR_ME_PRIVACY_HREF;
  return `<p class="discovery-region-privacy" id="discovery-near-me-privacy">${escapeDiscoveryHtml(DISCOVERY_NEAR_ME_PRIVACY_COPY)} <a href="${escapeDiscoveryHtml(href)}">Data policy</a>.</p>`;
}
