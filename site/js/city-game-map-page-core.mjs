/**
 * Boot city board pages — snapshot board, M4 list↔pin interaction, season banner.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import { applyDebriefBoardCta } from "./city-game-debrief-board-core.mjs";
import { resolveBoardContextView } from "./city-game-board-context-core.mjs";
import { discoveryPinIndexRelForSeason } from "./discovery-pin-projection-core.mjs";
import { renderMapBoard, showMapBoardError } from "./city-game-map-board-core.mjs";
import { bootCityGameMapInteraction } from "./city-game-map-interaction.mjs";
import { bootCityGameMapSnapshot } from "./city-game-map-snapshot.mjs";
import { resolvePlayPageSeason } from "./city-game-season-resolve.mjs";
import { bootCityGameSeasonBanners } from "./city-game-season-banner-core.mjs";
import { bootMapFirstVisitBanner } from "./city-game-map-first-visit-banner-core.mjs";

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

    bootMapFirstVisitBanner(root, season);

    /** @type {import("./discovery-pin-projection-core.mjs").DiscoveryPinIndex | null} */
    let pinIndex = null;
    const pinIndexUrl = discoveryPinIndexRelForSeason(season);
    try {
      const pinRes = await fetch(pinIndexUrl, { cache: "no-store" });
      if (pinRes.ok) pinIndex = await pinRes.json();
    } catch {
      pinIndex = null;
    }

    const contextView = resolveBoardContextView(season, { pinIndex });

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
  } catch (err) {
    console.warn("[city-game-map-page]", err);
    if (mount) showMapBoardError(mount, "City board could not load.");
    await bootCityGameSeasonBanners(root);
    return { ok: false, season: null };
  }
}
