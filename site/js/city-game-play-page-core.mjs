/**
 * Single boot path for city game play pages — season fetch, board, guide, banners.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import { buildPlayerGuideListHtml, resolvePlayerGuide } from "./city-game-player-guide-core.mjs";
import { buildNetworkCharterSectionHtml, resolveNetworkCharter } from "./city-game-reference-network-core.mjs";
import { resolvePlayPageSeason } from "./city-game-season-resolve.mjs";
import { bootCityGameSeasonBanners } from "./city-game-season-banner-core.mjs";
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";

/**
 * @param {HTMLElement} list
 */
function showPlayerGuideFallback(list) {
  if (list.children.length) return;
  list.innerHTML = `<article class="city-game-rules-plate hc-emphasis-card hc-emphasis-card--warn">
  <div class="hc-emphasis-card__main">
    <div class="hc-emphasis-card__copy">
      <p class="hc-emphasis-card__eyebrow">Start guide</p>
      <p class="hc-emphasis-card__detail">Could not load start guide. Open the place list below or scan any sticker you find.</p>
    </div>
  </div>
</article>`;
}

/**
 * Legacy #city-state links open the dedicated board page.
 * @param {Record<string, unknown>} season
 * @returns {boolean} true when navigation was triggered
 */
function redirectCityStateHashToBoardPage(season) {
  if (location.hash !== "#city-state") return false;
  const boardPath = seasonBoardPath(String(season.rules_path ?? ""));
  if (!boardPath) return false;
  location.replace(boardPath);
  return true;
}

/**
 * @param {Document | HTMLElement} [root]
 */
export async function bootCityGamePlayPage(root = document) {
  const guideList = root.getElementById("city-game-player-guide-list");
  const heroSubline = root.getElementById("city-game-hero-subline");

  /** @type {Record<string, unknown> | null} */
  let season = null;
  /** @type {{ seasonId: string; jsonUrl: string } | null} */
  let resolved = null;

  try {
    resolved = await resolvePlayPageSeason(guideList ?? undefined);
    const res = await fetch(resolved.jsonUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`season fetch ${res.status}`);
    season = await res.json();
  } catch (err) {
    console.warn("[city-game-play-page]", err);
    if (guideList instanceof HTMLElement) showPlayerGuideFallback(guideList);
    await bootCityGameSeasonBanners(root);
    return { ok: false, season: null };
  }

  if (guideList instanceof HTMLElement) {
    guideList.innerHTML = buildPlayerGuideListHtml(season);
  }
  if (heroSubline instanceof HTMLElement) {
    heroSubline.innerHTML = resolvePlayerGuide(season).heroSubline;
  }

  const charterMount = root.getElementById("city-game-network-charter-mount");
  if (charterMount instanceof HTMLElement) {
    charterMount.innerHTML = buildNetworkCharterSectionHtml(season);
  }

  const heroEyebrow = root.querySelector(".hero-compact .hero-eyebrow");
  const heroTitle = root.querySelector(".hero-compact h1");
  if (season.network_charter && typeof season.network_charter === "object") {
    const charter = resolveNetworkCharter(season);
    if (heroEyebrow instanceof HTMLElement) {
      heroEyebrow.textContent = charter.eyebrow;
    }
    if (heroTitle instanceof HTMLElement) {
      heroTitle.textContent = charter.title;
    }
  }

  if (redirectCityStateHashToBoardPage(season)) {
    return { ok: true, season };
  }

  await bootCityGameSeasonBanners(root);
  return { ok: true, season };
}
