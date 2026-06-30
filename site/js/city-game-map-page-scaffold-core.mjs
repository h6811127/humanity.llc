/**
 * Generate portable city board pages from season JSON.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

import {
  buildMapPagePlayerFootnoteHtml,
  buildPlayerFlowMapBreadcrumbHtml,
  resolveSeasonDiscoveryBrowseHref,
} from "./public-network-player-nav-core.mjs";
import { buildSeasonBannerBlock, formatSeasonWindowLabel } from "./city-game-season-banner-core.mjs";
import {
  seasonBoardPath,
  seasonJsonPublicUrl,
  seasonLaunchContext,
} from "./city-game-season-path-shared.mjs";

export const MAP_PAGE_SCRIPT = "/js/city-game-map-page.mjs?v=5";
export const STYLES_HREF = "/styles.css?v=157";

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 */
export function buildMapPageHtml(season, jsonBasename) {
  const ctx = seasonLaunchContext(season, jsonBasename);
  const city = String(season.city ?? ctx.slug).trim() || ctx.slug;
  const title = String(season.title ?? season.season_id ?? "Season").trim();
  const seasonId = String(season.season_id ?? "").trim();
  const jsonUrl = seasonJsonPublicUrl(jsonBasename);
  const boardPath = seasonBoardPath(ctx.rulesPath) ?? ctx.boardPath;
  const mapCopy = season.map_copy && typeof season.map_copy === "object"
    ? /** @type {Record<string, string>} */ (season.map_copy)
    : {};
  const boardTitle = mapCopy.title?.trim() || "Weekend city board";
  const heroObjective =
    mapCopy.hero_objective?.trim() ||
    `The city is asleep. Find fragments around ${city}.`;
  const isPlanned = season.status === "planned" || !formatSeasonWindowLabel(season);
  const robotsMeta = isPlanned
    ? '    <meta name="robots" content="noindex, nofollow" />\n'
    : "";
  const metaDescription = `${heroObjective} Weekend city board for ${city}. No app. No account.`;
  const canonicalMeta = boardPath
    ? `    <link rel="canonical" href="${escapeHtml(boardPath)}" />\n`
    : "";

  const bannerOrHint = isPlanned
    ? `<div class="research-dev-hint" role="note">
          <p>
            <strong>Template only.</strong> Publish the season from
            <a href="/created/">/created/</a> to open the live board.
          </p>
        </div>`
    : `${buildSeasonBannerBlock(season, jsonUrl, "map")}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>${escapeHtml(boardTitle)} · ${escapeHtml(city)} · humanity.llc</title>
    <meta
      name="description"
      content="${escapeHtml(metaDescription)}"
    />
${robotsMeta}${canonicalMeta}    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" href="/assets/red_qr_transparent_bg.png" type="image/png" />
    <link rel="stylesheet" href="${STYLES_HREF}" />
  </head>
  <body>
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">
          <span class="pass-dot" aria-hidden="true"></span>
          <span>humanity.llc</span>
        </a>
        <a class="top-create" href="/create/">Create</a>
      </header>

      <main class="screen screen-landing">
        ${buildPlayerFlowMapBreadcrumbHtml(boardTitle, escapeHtml)}
        <section class="hero hero-compact city-game-map-page-hero">
          <p class="hero-eyebrow">${escapeHtml(city)}</p>
          <h1 id="city-state-title">${escapeHtml(boardTitle)}</h1>
          <p class="hero-lead city-game-map-page-lead">A read-only weekend board — see which places are active, then scan stickers for live details.</p>
          <p class="hero-line hero-line-sub">
            <a href="${escapeHtml(ctx.rulesPath)}#rules-start-title">How this network works</a>
          </p>
        </section>

        ${bannerOrHint}

        <section
          class="idea-section city-game-map-section"
          id="city-state"
          aria-labelledby="city-state-title"
        >
          <div id="city-game-map-first-visit-mount" class="city-game-map-first-visit-mount" hidden></div>
          <div id="city-game-map-root" class="city-game-map-root" data-season-id="${escapeHtml(seasonId)}">
            <noscript>
              <p class="city-game-map-error">
                City board needs JavaScript. Open
                <a href="${escapeHtml(jsonUrl)}">season data</a>
                or scan any game sticker for live state.
              </p>
            </noscript>
            <p class="city-game-map-loading" aria-live="polite">Loading city board…</p>
          </div>
        </section>

        ${buildMapPagePlayerFootnoteHtml(season, ctx.rulesPath, escapeHtml)}
      </main>
    </div>
    <script type="module" src="${MAP_PAGE_SCRIPT}"></script>
  </body>
</html>
`;
}

/**
 * @param {string} html
 * @param {Record<string, unknown>} season
 */
export function verifyMapPageHtml(html, season) {
  const issues = [];
  const seasonId = String(season.season_id ?? "").trim();
  if (!seasonId) issues.push("season_id required");
  if (!html.includes(`data-season-id="${seasonId}"`)) {
    issues.push(`missing data-season-id="${seasonId}"`);
  }
  if (!html.includes("city-game-map-page.mjs")) {
    issues.push("missing city-game-map-page.mjs boot script");
  }
  if (!html.includes('id="city-game-map-root"')) {
    issues.push("missing city-game-map-root mount");
  }
  if (!html.includes('id="city-state"')) {
    issues.push("missing #city-state section");
  }
  if (!html.includes('id="city-game-map-first-visit-mount"')) {
    issues.push("missing city-game-map-first-visit-mount");
  }
  if (!html.includes("player-flow-breadcrumb")) {
    issues.push("missing player-flow-breadcrumb");
  }
  const discoverHref = resolveSeasonDiscoveryBrowseHref(season);
  if (discoverHref && !html.includes(discoverHref)) {
    issues.push(`missing discover browse link ${discoverHref}`);
  }
  const boardPath = seasonBoardPath(String(season.rules_path ?? ""));
  if (boardPath && !html.includes(boardPath)) {
    issues.push(`missing canonical board path ${boardPath}`);
  }
  return { ok: issues.length === 0, issues };
}
