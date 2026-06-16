/**
 * Landing entry shelves — map "Browse by need" rows to portal category filters.
 */

/** @typedef {import("./public-networks-portal-core.mjs").PublicNetworkCategoryFilter} PublicNetworkCategoryFilter */

/** @type {Record<string, PublicNetworkCategoryFilter>} */
export const LANDING_ENTRY_SHELF_CATEGORIES = {
  "landing-shelf-live-now": "city_games",
  "landing-shelf-open-paused": "resources",
  "landing-shelf-return-hours": "all",
};

/**
 * @param {string} shelfId
 * @returns {PublicNetworkCategoryFilter}
 */
export function resolveLandingShelfCategory(shelfId) {
  const id = String(shelfId ?? "").trim();
  return LANDING_ENTRY_SHELF_CATEGORIES[id] ?? "all";
}

/**
 * @param {PublicNetworkCategoryFilter} category
 * @returns {string | null}
 */
export function landingShelfIdForCategory(category) {
  const cat = String(category ?? "all").trim();
  if (!cat || cat === "all") return null;
  for (const [shelfId, mapped] of Object.entries(LANDING_ENTRY_SHELF_CATEGORIES)) {
    if (mapped === cat) return shelfId;
  }
  return null;
}

/**
 * @param {{ seasonName?: string | null; placeCount?: number | null; city?: string | null }} ctx
 * @returns {string}
 */
export function formatLiveNowShelfCopy(ctx = {}) {
  const name = String(ctx.seasonName ?? "Wake the City").trim() || "Wake the City";
  const city = String(ctx.city ?? "Cedar Rapids").trim() || "Cedar Rapids";
  const count = ctx.placeCount;
  if (typeof count === "number" && count > 0) {
    const places = `${count} place${count === 1 ? "" : "s"}`;
    return `${name} — ${places} in ${city}. Tap to browse live city games and open the board.`;
  }
  return (
    "Weekend games, festivals, and shared play — what's happening around town this season."
  );
}

/**
 * @param {Document | HTMLElement} [root]
 * @param {{ seasonName?: string | null; placeCount?: number | null; city?: string | null }} ctx
 */
export function syncLiveNowShelfCopy(root = typeof document !== "undefined" ? document : null, ctx = {}) {
  if (!root || typeof root.querySelector !== "function") return;
  const copyEl = root.querySelector("#landing-shelf-live-now .landing-entry-shelf-copy");
  if (!(copyEl instanceof HTMLElement)) return;
  copyEl.textContent = formatLiveNowShelfCopy(ctx);
}

/**
 * @param {string} [search]
 * @returns {PublicNetworkCategoryFilter}
 */
export function readLandingCategoryQueryParam(search = "") {
  const raw = String(search ?? "").trim();
  if (!raw) return "all";
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const category = params.get("category")?.trim();
  if (
    category === "city_games" ||
    category === "markets" ||
    category === "events" ||
    category === "resources"
  ) {
    return category;
  }
  return "all";
}

/**
 * @param {PublicNetworkCategoryFilter} category
 * @param {string} [pathname]
 * @returns {string}
 */
export function buildLandingCategoryUrl(category, pathname = "/") {
  const path = String(pathname ?? "/").trim() || "/";
  const cat = String(category ?? "all").trim();
  if (!cat || cat === "all") return path;
  const params = new URLSearchParams();
  params.set("category", cat);
  return `${path}?${params.toString()}`;
}
