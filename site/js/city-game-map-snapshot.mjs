/**
 * Poll season snapshot for live map ticker + node chips (M2/M3).
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  applySnapshotToMapBoard,
  CITY_GAME_SNAPSHOT_POLL_MS,
  CITY_GAME_SNAPSHOT_STALE_MS,
  markSnapshotStale,
  renderTickerHeadlines,
  seasonSnapshotUrl,
} from "./city-game-map-snapshot-core.mjs";

const FALLBACK_LINE =
  "City state board unavailable — scan game stickers for live object truth.";

/**
 * @param {HTMLElement} boardRoot
 * @param {string} seasonId
 */
export async function refreshCityGameMapSnapshot(boardRoot, seasonId) {
  const tickerList = boardRoot.querySelector("#city-game-live-map-ticker");
  const syncEl = boardRoot.querySelector("#city-game-map-sync");

  try {
    const res = await fetch(seasonSnapshotUrl(seasonId, resolverApiOrigin()), {
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const snapshot = await res.json();
    renderTickerHeadlines(tickerList, snapshot.headlines);
    applySnapshotToMapBoard(boardRoot, snapshot);
    boardRoot.dataset.snapshotLoaded = "1";
    return snapshot;
  } catch {
    if (tickerList instanceof HTMLUListElement && !tickerList.dataset.loaded) {
      renderTickerHeadlines(tickerList, [FALLBACK_LINE]);
    }
    markSnapshotStale(syncEl);
    return null;
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} seasonId
 */
export function bootCityGameMapSnapshot(boardRoot, seasonId) {
  if (!boardRoot || !seasonId) return;

  const tick = () => {
    void refreshCityGameMapSnapshot(boardRoot, seasonId);
  };

  tick();
  window.setInterval(tick, CITY_GAME_SNAPSHOT_POLL_MS);

  window.setInterval(() => {
    const syncEl = boardRoot.querySelector("#city-game-map-sync");
    const generatedAt = syncEl?.dataset.generatedAt;
    if (!generatedAt || !(syncEl instanceof HTMLElement)) return;
    const age = Date.now() - Date.parse(generatedAt);
    if (Number.isFinite(age) && age > CITY_GAME_SNAPSHOT_STALE_MS) {
      markSnapshotStale(syncEl);
    }
  }, CITY_GAME_SNAPSHOT_POLL_MS);
}
