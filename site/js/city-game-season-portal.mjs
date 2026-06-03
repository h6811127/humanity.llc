/**
 * Registered seasons portal — phase-aware window labels.
 */
import {
  resolveSeasonWindowPhase,
  seasonListSubtitle,
} from "./city-game-season-banner-core.mjs";
import { CITY_GAME_SEASONS_INDEX_URL } from "./city-game-season-resolve.mjs";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchSeasonConfig(jsonUrl) {
  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`season fetch ${res.status}`);
  return res.json();
}

async function bootCityGameSeasonPortal() {
  const list = document.getElementById("city-game-season-list");
  if (!list) return;

  try {
    const res = await fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json();
    const rows = Array.isArray(body.seasons) ? body.seasons : [];
    if (!rows.length) {
      list.innerHTML =
        '<li class="list-row"><span class="list-content"><span class="list-sub">No seasons registered yet.</span></span></li>';
      return;
    }

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const jsonUrl = row.json_url?.trim();
        if (!jsonUrl) return { row, subtitle: row.city ?? "" };
        try {
          const season = await fetchSeasonConfig(jsonUrl);
          const phase = resolveSeasonWindowPhase(new Date(), season);
          return {
            row,
            subtitle: seasonListSubtitle(phase, { ...season, city: row.city ?? season.city }),
          };
        } catch (err) {
          console.warn("[city-game-season-portal]", jsonUrl, err);
          return { row, subtitle: row.city ?? "" };
        }
      })
    );

    list.innerHTML = enriched
      .map(({ row, subtitle }) => {
        const href =
          row.rules_path || `/play/season/?season_id=${encodeURIComponent(row.season_id)}`;
        return `<li class="list-row">
  <a class="list-row-link" href="${escapeHtml(href)}">
    <span class="list-content">
      <span class="list-title">${escapeHtml(row.title ?? row.season_id)}</span>
      <span class="list-sub">${escapeHtml(subtitle)}</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>
  </a>
</li>`;
      })
      .join("");
  } catch (err) {
    console.warn("[city-game-season-portal]", err);
    list.innerHTML =
      '<li class="list-row"><span class="list-content"><span class="list-sub">Could not load season index.</span></span></li>';
  }
}

bootCityGameSeasonPortal();
