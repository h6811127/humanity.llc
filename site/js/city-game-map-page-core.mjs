/**
 * Boot city board pages — snapshot board, M4 list↔pin interaction, season banner.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import { applyDebriefBoardCta } from "./city-game-debrief-board-core.mjs";
import { resolveBoardContextView } from "./city-game-board-context-core.mjs";
import { renderMapBoard, showMapBoardError } from "./city-game-map-board-core.mjs";
import { bootCityGameMapInteraction } from "./city-game-map-interaction.mjs";
import { bootCityGameMapSnapshot } from "./city-game-map-snapshot.mjs";
import { resolvePlayPageSeason } from "./city-game-season-resolve.mjs";
import { bootCityGameSeasonBanners } from "./city-game-season-banner-core.mjs";

/**
 * @param {Document | HTMLElement} [root]
 */
export async function bootCityGameMapPage(root = document) {
  const mount = root.getElementById("city-game-map-root");

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
    console.warn("[city-game-map-page]", err);
    if (mount) showMapBoardError(mount, "City board could not load.");
    await bootCityGameSeasonBanners(root);
    return { ok: false, season: null };
  }

  const contextView = resolveBoardContextView(season);

  if (mount instanceof HTMLElement) {
    const result = renderMapBoard(mount, season, contextView);
    if (!result.ok) {
      console.warn("[city-game-map-page] map layout", result.issues);
      await bootCityGameSeasonBanners(root);
      return { ok: false, season, contextView: null };
    }

    const boardRoot = mount.querySelector(".city-game-map-board");
    if (boardRoot instanceof HTMLElement) {
      bootCityGameMapInteraction(boardRoot, season);
      bootCityGameMapSnapshot(
        boardRoot,
        contextView.snapshot.season_id || String(resolved?.seasonId ?? "")
      );
      applyDebriefBoardCta(boardRoot, season);
    }
  }

  await bootCityGameSeasonBanners(root);
  return { ok: true, season, contextView };
}
