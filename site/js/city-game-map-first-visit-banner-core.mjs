/**
 * One-time map shell intro — outside #city-game-map-root (Agent D shell only).
 */
import {
  PUBLIC_NETWORK_RULES_PROVE_CTA,
  publicNetworkRulesProveHref,
} from "./public-networks-portal-core.mjs";

export const MAP_FIRST_VISIT_STORAGE_PREFIX = "hc_city_game_map_intro_dismissed";

/**
 * @param {string | null | undefined} seasonId
 */
export function mapFirstVisitStorageKey(seasonId) {
  const id = String(seasonId ?? "").trim() || "default";
  return `${MAP_FIRST_VISIT_STORAGE_PREFIX}:${id}`;
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string | null | undefined} seasonId
 */
export function shouldShowMapFirstVisitBanner(storage, seasonId) {
  if (!storage) return true;
  try {
    return storage.getItem(mapFirstVisitStorageKey(seasonId)) !== "1";
  } catch {
    return true;
  }
}

/**
 * @param {string} value
 */
function escapeMapBannerHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string | null | undefined} rulesProveHref
 */
export function buildMapFirstVisitBannerHtml(rulesProveHref) {
  const href = rulesProveHref ? escapeMapBannerHtml(rulesProveHref) : "#";
  const cta = escapeMapBannerHtml(PUBLIC_NETWORK_RULES_PROVE_CTA);
  return `<aside
  class="hc-notice hc-notice--info city-game-map-first-visit-banner"
  id="city-game-map-first-visit-banner"
  role="note"
  aria-labelledby="city-game-map-first-visit-title"
>
  <p class="city-game-map-first-visit-banner-copy" id="city-game-map-first-visit-title">
    Shared signed state on real stickers — no account, no visit log.
    <a href="${href}">${cta}</a>.
  </p>
  <button
    type="button"
    class="hc-notice-ack city-game-map-first-visit-dismiss"
    id="city-game-map-first-visit-dismiss"
  >
    Got it
  </button>
</aside>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveMapFirstVisitRulesHref(season) {
  return publicNetworkRulesProveHref(String(season.rules_path ?? ""));
}

/**
 * @param {Document | HTMLElement} root
 * @param {Record<string, unknown>} season
 * @param {{ storage?: Storage | null }} [opts]
 */
export function bootMapFirstVisitBanner(root, season, opts = {}) {
  const mount = root.getElementById("city-game-map-first-visit-mount");
  if (!(mount instanceof HTMLElement)) return { shown: false };

  const seasonId = String(season.season_id ?? "").trim();
  const storage =
    opts.storage ??
    (typeof window !== "undefined" && window.sessionStorage ? window.sessionStorage : null);

  if (!shouldShowMapFirstVisitBanner(storage, seasonId)) {
    mount.hidden = true;
    mount.innerHTML = "";
    return { shown: false };
  }

  const rulesHref = resolveMapFirstVisitRulesHref(season);
  mount.hidden = false;
  mount.innerHTML = buildMapFirstVisitBannerHtml(rulesHref);

  const dismiss = mount.querySelector("#city-game-map-first-visit-dismiss");
  if (!(dismiss instanceof HTMLButtonElement)) return { shown: true };

  dismiss.addEventListener("click", () => {
    try {
      storage?.setItem(mapFirstVisitStorageKey(seasonId), "1");
    } catch {
      /* ignore */
    }
    mount.hidden = true;
    mount.innerHTML = "";
  });

  return { shown: true };
}
