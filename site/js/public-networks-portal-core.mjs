/**
 * Public network discovery — filter + card render (Pages-only, no resolver).
 */
import { resolveSeasonWindowPhase } from "./city-game-season-banner-core.mjs";
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";

/** @typedef {"all" | "city_games" | "markets" | "events" | "resources"} PublicNetworkCategoryFilter */

export const PUBLIC_NETWORK_CATEGORY_CHIPS = [
  { id: "all", label: "All" },
  { id: "city_games", label: "City games" },
  { id: "markets", label: "Markets" },
  { id: "events", label: "Events" },
  { id: "resources", label: "Resources" },
];

/** Display labels for card kind/category row. */
export const PUBLIC_NETWORK_CATEGORY_LABELS = {
  city_games: "City game",
  markets: "Market",
  events: "Event",
  resources: "Resource",
};

/**
 * Static vision cards (not live networks). Shown for product coherence only.
 * @type {Array<{ id: string; name: string; place: string; category: string; summary: string; availability: "prototype" | "coming_soon" }>}
 */
export const PUBLIC_NETWORK_VISION_CARDS = [
  {
    id: "vision_weekend_market",
    name: "Weekend public market",
    place: "Prototype · any city",
    category: "markets",
    summary:
      "Vendor stalls and amenities on one live board. Market managers opt in each Saturday.",
    availability: "prototype",
  },
  {
    id: "vision_festival_weekend",
    name: "Festival weekend network",
    place: "Coming soon · temporary venues",
    category: "events",
    summary:
      "Doors, stages, and info points share one public state board for the run of the show.",
    availability: "coming_soon",
  },
  {
    id: "vision_crisis_resources",
    name: "Community resource board",
    place: "Coming soon · regional listing",
    category: "resources",
    summary:
      "Cooling centers, shelters, and supply points with signed open or paused status.",
    availability: "coming_soon",
  },
];

/**
 * @param {string} value
 */
export function escapePublicNetworksHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} row
 */
export function indexRowPublicListing(row) {
  const raw = row.public_listing;
  if (!raw || typeof raw !== "object") {
    return { listed: false, title: null, summary: null, region: null, category: null };
  }
  const listing = /** @type {Record<string, unknown>} */ (raw);
  return {
    listed: listing.listed === true,
    title: typeof listing.title === "string" ? listing.title.trim() : null,
    summary: typeof listing.summary === "string" ? listing.summary.trim() : null,
    region: typeof listing.region === "string" ? listing.region.trim() : null,
    category: typeof listing.category === "string" ? listing.category.trim() : null,
  };
}

/**
 * @param {"unset" | "before" | "open" | "after"} phase
 */
export function publicNetworkWindowStatusLabel(phase) {
  if (phase === "open") return "Live now";
  if (phase === "before") return "Play opens soon · board open now";
  if (phase === "after") return "Ended";
  return "Listed";
}

/** Secondary CTA on live network cards — charter before board for strangers. */
export const PUBLIC_NETWORK_ABOUT_NETWORK_CTA = "About this network";

/** Primary CTA label for listed networks with an open board href. */
export const PUBLIC_NETWORK_OPEN_BOARD_CTA = "Open board";

/** Optional schematic / board preview art by season id (static assets only). */
export const PUBLIC_NETWORK_SEASON_PREVIEW_ART = {
  cr_season_01_wake: "/dev/find-public-networks-qa/cedar-rapids-board-open.png",
};

/**
 * @param {Record<string, unknown> | null | undefined} seasonConfig
 */
export function countSeasonPlaces(seasonConfig) {
  if (!seasonConfig || typeof seasonConfig !== "object") return null;
  const nodes = seasonConfig.nodes;
  if (!Array.isArray(nodes)) return null;
  return nodes.length;
}

/**
 * @param {Record<string, unknown> | null | undefined} seasonConfig
 */
export function countSeasonLiveObjects(seasonConfig) {
  const places = countSeasonPlaces(seasonConfig);
  if (places == null) return null;
  return places;
}

/**
 * @param {string} seasonId
 */
export function publicNetworkPreviewArtForSeason(seasonId) {
  return (
    PUBLIC_NETWORK_SEASON_PREVIEW_ART[
      /** @type {keyof typeof PUBLIC_NETWORK_SEASON_PREVIEW_ART} */ (seasonId)
    ] ?? null
  );
}

/**
 * @param {{ placeCount?: number | null; objectCount?: number | null; isLive?: boolean }} card
 */
export function formatPublicNetworkStatsLine(card) {
  const parts = [];
  if (card.placeCount != null && card.placeCount > 0) {
    parts.push(`${card.placeCount} place${card.placeCount === 1 ? "" : "s"}`);
  }
  if (card.objectCount != null && card.objectCount > 0) {
    parts.push(`${card.objectCount} live object${card.objectCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

/**
 * @param {string} category
 */
export function renderPublicNetworkSchematicPreview(category) {
  const stroke =
    category === "city_games"
      ? "#e63946"
      : category === "resources"
        ? "#60a5fa"
        : category === "markets"
          ? "#a78bfa"
          : "#94a3b8";
  return `<div class="public-networks-card__schematic" aria-hidden="true"><svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="120" fill="rgba(0,0,0,0.04)"/><g fill="${stroke}" opacity="0.55"><circle cx="60" cy="60" r="5"/><circle cx="130" cy="40" r="5"/><circle cx="200" cy="72" r="5"/><circle cx="260" cy="52" r="5"/></g><polyline points="60,60 130,40 200,72 260,52" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.35"/></svg></div>`;
}

/**
 * @param {"unset" | "before" | "open" | "after"} phase
 */
export function publicNetworkWindowStatusClass(phase) {
  if (phase === "open") return "public-networks-card__status--live";
  if (phase === "before") return "public-networks-card__status--soon";
  if (phase === "after") return "public-networks-card__status--ended";
  return "public-networks-card__status--listed";
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown> | null} [seasonConfig]
 * @param {Date} [now]
 */
export function buildPublicNetworkCardModel(row, seasonConfig = null, now = new Date()) {
  const listing = indexRowPublicListing(row);
  const season = seasonConfig ?? row;
  const phase = resolveSeasonWindowPhase(now, season);
  const rulesPath = String(row.rules_path ?? season.rules_path ?? "").trim();
  const boardPath = seasonBoardPath(rulesPath) ?? rulesPath;
  const name =
    listing.title ||
    String(row.title ?? season.title ?? row.season_id ?? "").trim() ||
    String(row.season_id ?? "");
  const place = listing.region || String(row.city ?? season.city ?? "").trim();
  const summary =
    listing.summary ||
    "Public live-object network. Scan stickers for signed state, not a personal feed.";
  const category = listing.category || "city_games";
  const searchText = [name, place, summary, category.replace(/_/g, " ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const categoryLabel =
    PUBLIC_NETWORK_CATEGORY_LABELS[/** @type {keyof typeof PUBLIC_NETWORK_CATEGORY_LABELS} */ (
      category
    )] ?? "Network";

  const seasonId = String(row.season_id ?? "");
  const placeCount = countSeasonPlaces(seasonConfig);
  const objectCount = countSeasonLiveObjects(seasonConfig);
  const previewArt = publicNetworkPreviewArtForSeason(seasonId);
  const statsLine = formatPublicNetworkStatsLine({ placeCount, objectCount, isLive: true });

  return {
    season_id: seasonId,
    name,
    place,
    summary,
    category,
    categoryLabel,
    phase,
    isLive: true,
    statusLabel: publicNetworkWindowStatusLabel(phase),
    statusClass: publicNetworkWindowStatusClass(phase),
    openHref: boardPath,
    rulesHref: rulesPath || null,
    placeCount,
    objectCount,
    previewArt,
    statsLine,
    searchText,
  };
}

/**
 * @param {{ id: string; name: string; place: string; category: string; summary: string; availability: "prototype" | "coming_soon" }} row
 */
export function buildPublicNetworkVisionCardModel(row) {
  const category = row.category || "city_games";
  const categoryLabel =
    PUBLIC_NETWORK_CATEGORY_LABELS[/** @type {keyof typeof PUBLIC_NETWORK_CATEGORY_LABELS} */ (
      category
    )] ?? "Network";
  const isPrototype = row.availability === "prototype";
  const statusLabel = isPrototype ? "Prototype" : "Coming soon";
  const statusClass = isPrototype
    ? "public-networks-card__status--prototype"
    : "public-networks-card__status--soon";
  const searchText = [row.name, row.place, row.summary, categoryLabel, statusLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    season_id: row.id,
    name: row.name,
    place: row.place,
    summary: row.summary,
    category,
    categoryLabel,
    phase: /** @type {"unset"} */ ("unset"),
    isLive: false,
    statusLabel,
    statusClass,
    openHref: null,
    rulesHref: null,
    placeCount: null,
    objectCount: null,
    previewArt: null,
    statsLine: "",
    searchText,
  };
}

/**
 * Vision cards for discovery UI (static; not resolver-backed).
 */
export function publicNetworkVisionCardModels() {
  return PUBLIC_NETWORK_VISION_CARDS.map((row) => buildPublicNetworkVisionCardModel(row));
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function listedPublicNetworkRows(rows) {
  return rows.filter((row) => indexRowPublicListing(row).listed);
}

/**
 * @param {ReturnType<typeof buildPublicNetworkCardModel>[]} cards
 * @param {{ query?: string; category?: PublicNetworkCategoryFilter }} filters
 */
export function filterPublicNetworkCards(cards, filters = {}) {
  const query = String(filters.query ?? "")
    .trim()
    .toLowerCase();
  const category = filters.category ?? "all";

  return cards.filter((card) => {
    if (category !== "all" && card.category !== category) return false;
    if (!query) return true;
    return card.searchText.includes(query);
  });
}

/**
 * @param {PublicNetworkCategoryFilter} activeCategory
 * @param {ReturnType<typeof buildPublicNetworkCardModel>[]} allCards
 */
export function renderPublicNetworkCategoryChips(activeCategory, allCards) {
  return PUBLIC_NETWORK_CATEGORY_CHIPS.map((chip) => {
    const count =
      chip.id === "all"
        ? allCards.length
        : allCards.filter((card) => card.category === chip.id).length;
    const active = activeCategory === chip.id ? " public-networks-filter-btn--active" : "";
    return `<button type="button" class="public-networks-filter-btn${active}" data-public-network-category="${escapePublicNetworksHtml(chip.id)}" aria-pressed="${activeCategory === chip.id ? "true" : "false"}">${escapePublicNetworksHtml(chip.label)}<span class="public-networks-filter-btn-count">${count}</span></button>`;
  }).join("");
}

/**
 * @param {ReturnType<typeof buildPublicNetworkCardModel>} card
 */
export function renderPublicNetworkCardPreview(card) {
  if (card.previewArt) {
    return `<div class="public-networks-card__preview"><img src="${escapePublicNetworksHtml(card.previewArt)}" alt="" loading="lazy" decoding="async" /></div>`;
  }
  return renderPublicNetworkSchematicPreview(card.category);
}

export function renderPublicNetworkCard(card) {
  const rulesLink = card.rulesHref
    ? `<a class="public-networks-card__secondary" href="${escapePublicNetworksHtml(card.rulesHref)}">${escapePublicNetworksHtml(PUBLIC_NETWORK_ABOUT_NETWORK_CTA)}</a>`
    : "";
  const liveAttr = card.isLive ? ' data-network-live="true"' : ' data-network-live="false"';
  const cta = card.isLive && card.openHref
    ? `<a class="landing-hero-btn landing-hero-btn-primary public-networks-card__cta" href="${escapePublicNetworksHtml(card.openHref)}">${escapePublicNetworksHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)}</a>`
    : `<span class="landing-hero-btn landing-hero-btn-primary public-networks-card__cta public-networks-card__cta--disabled" aria-disabled="true">${escapePublicNetworksHtml(card.statusLabel)}</span>`;
  const statsLine = card.statsLine
    ? `<p class="public-networks-card__stats">${escapePublicNetworksHtml(card.statsLine)}</p>`
    : "";
  return `<article class="public-networks-card public-networks-card--rich${card.isLive ? "" : " public-networks-card--vision"}" data-season-id="${escapePublicNetworksHtml(card.season_id)}" data-category="${escapePublicNetworksHtml(card.category)}"${liveAttr}>
  ${renderPublicNetworkCardPreview(card)}
  <div class="public-networks-card__body">
  <div class="public-networks-card__head">
    <h3 class="public-networks-card__title">${escapePublicNetworksHtml(card.name)}</h3>
    <span class="public-networks-card__status ${card.statusClass}">${escapePublicNetworksHtml(card.statusLabel)}</span>
  </div>
  <p class="public-networks-card__meta"><span class="public-networks-card__kind">${escapePublicNetworksHtml(card.categoryLabel)}</span><span class="public-networks-card__scope">${escapePublicNetworksHtml(card.place)}</span></p>
  ${statsLine}
  <p class="public-networks-card__summary">${escapePublicNetworksHtml(card.summary)}</p>
  <div class="public-networks-card__actions">
    ${cta}
    ${rulesLink}
  </div>
  </div>
</article>`;
}

/**
 * @param {ReturnType<typeof buildPublicNetworkCardModel>[]} cards
 */
export function renderPublicNetworkResults(cards) {
  if (!cards.length) {
    return "";
  }
  return cards.map((card) => renderPublicNetworkCard(card)).join("");
}

/**
 * @param {{ query?: string; category?: PublicNetworkCategoryFilter; hasListed?: boolean }} ctx
 */
export function publicNetworksEmptyMessage(ctx = {}) {
  if (!ctx.hasListed) {
    return "No public networks listed yet. Organizers can opt in when they publish a season.";
  }
  if (ctx.category && ctx.category !== "all") {
    const chip = PUBLIC_NETWORK_CATEGORY_CHIPS.find((row) => row.id === ctx.category);
    const label = chip?.label ?? "This category";
    return `No listed networks in ${label} yet.`;
  }
  if (ctx.query) {
    return "No public networks match that search. Try a city name or check spelling.";
  }
  return "No public networks match these filters.";
}
