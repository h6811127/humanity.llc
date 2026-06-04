/**
 * Boot Cedar Rapids post-season debrief (SW-14).
 */
import { resolvePlayPageSeason } from "./city-game-season-resolve.mjs";
import {
  fetchSeasonSnapshotForDebrief,
  renderDebriefPanel,
  resolveDebriefCopy,
} from "./city-game-debrief-core.mjs";
import { resolveSeasonWindowPhase } from "./city-game-season-banner-core.mjs";

async function main() {
  const mount = document.getElementById("city-game-debrief-root");
  const titleEl = document.getElementById("city-game-debrief-title");
  if (!(mount instanceof HTMLElement)) return;

  try {
    const resolved = await resolvePlayPageSeason(mount);
    const seasonRes = await fetch(resolved.jsonUrl, { cache: "no-store" });
    if (!seasonRes.ok) throw new Error(`season ${seasonRes.status}`);
    const season = await seasonRes.json();
    const copy = resolveDebriefCopy(season);
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = copy.title;
    }

    const phase = resolveSeasonWindowPhase(new Date(), season);
    const snap = await fetchSeasonSnapshotForDebrief(
      String(season.season_id ?? resolved.seasonId),
      window.location.origin
    );

    renderDebriefPanel(mount, {
      season,
      snapshot: snap.ok ? snap.snapshot : null,
      windowPhase: phase,
    });
  } catch (err) {
    console.warn("[city-game-debrief]", err);
    mount.innerHTML =
      '<p class="city-game-map-error" role="alert">Debrief could not load. Try the <a href="/play/cedar-rapids/">rules page</a> or scan a sticker for live state.</p>';
  }
}

main();
