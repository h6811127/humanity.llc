/**
 * Single boot path for city game play pages — season fetch, board, guide, banners.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import { renderMapBoard, showMapBoardError } from "./city-game-map-board-core.mjs";
import { bootCityGameMapSnapshot } from "./city-game-map-snapshot.mjs";
import { buildPlayerGuideListHtml, resolvePlayerGuide } from "./city-game-player-guide-core.mjs";
import { resolvePlayPageSeason } from "./city-game-season-resolve.mjs";
import { bootCityGameSeasonBanners } from "./city-game-season-banner-core.mjs";

/**
 * @param {HTMLElement} list
 */
function showPlayerGuideFallback(list) {
  if (list.children.length) return;
  list.innerHTML =
    '<li class="list-row"><span class="list-content"><span class="list-sub">Could not load start guide — open the place list below or scan any sticker you find.</span></span></li>';
}

function scrollToCityStateAnchor() {
  if (location.hash !== "#city-state") return;
  const section = document.getElementById("city-state");
  if (!(section instanceof HTMLElement)) return;
  requestAnimationFrame(() => {
    section.scrollIntoView({ block: "start", behavior: "auto" });
  });
}

/**
 * @param {Document | HTMLElement} [root]
 */
export async function bootCityGamePlayPage(root = document) {
  const mount = root.getElementById("city-game-map-root");
  const guideList = root.getElementById("city-game-player-guide-list");
  const heroSubline = root.getElementById("city-game-hero-subline");

  /** @type {Record<string, unknown> | null} */
  let season = null;
  /** @type {{ seasonId: string; jsonUrl: string } | null} */
  let resolved = null;

  try {
    resolved = await resolvePlayPageSeason(mount ?? undefined);
    const res = await fetch(resolved.jsonUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`season fetch ${res.status}`);
    season = await res.json();
  } catch (err) {
    console.warn("[city-game-play-page]", err);
    if (mount) showMapBoardError(mount, "City board could not load.");
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

  if (mount instanceof HTMLElement) {
    const result = renderMapBoard(mount, season);
    if (!result.ok) {
      console.warn("[city-game-play-page] map layout", result.issues);
      await bootCityGameSeasonBanners(root);
      return { ok: false, season };
    }

    scrollToCityStateAnchor();
    const boardRoot = mount.querySelector(".city-game-map-board");
    if (boardRoot instanceof HTMLElement) {
      bootCityGameMapSnapshot(
        boardRoot,
        String(season.season_id ?? resolved?.seasonId ?? "")
      );
    }
  }

  await bootCityGameSeasonBanners(root);
  return { ok: true, season };
}
