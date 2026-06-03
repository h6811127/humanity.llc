/**
 * Generate portable play rules pages from season JSON (Phase E prep).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Rules page generator
 */

import { buildSeasonBannerBlock, formatSeasonWindowLabel } from "./city-game-season-banner-core.mjs";
import {
  seasonJsonPublicUrl,
  seasonLaunchContext,
} from "./city-game-season-path-shared.mjs";

export const PLAY_PAGE_SCRIPT = "/js/city-game-play-page.mjs?v=2";
export const STYLES_HREF = "/styles.css?v=144";
export const PILOT_PLAY_SLUG = "cedar-rapids";

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
export function buildPlayPageHtml(season, jsonBasename) {
  const ctx = seasonLaunchContext(season, jsonBasename);
  const city = String(season.city ?? ctx.slug).trim() || ctx.slug;
  const title = String(season.title ?? season.season_id ?? "Season").trim();
  const seasonId = String(season.season_id ?? "").trim();
  const jsonUrl = seasonJsonPublicUrl(jsonBasename);
  const playPage = season.play_page && typeof season.play_page === "object"
    ? /** @type {Record<string, string>} */ (season.play_page)
    : {};
  const heroLine =
    playPage.hero_line?.trim() ||
    `Over one weekend, public objects around ${city} show <strong>live signed state</strong> — collective progress, route windows, and care pauses. No app. No account.`;
  const metaDescription =
    playPage.meta_description?.trim() ||
    `Rules for ${city} — public object state, cooperation-first play, and what scans prove without tracking players.`;
  const heroEyebrow = playPage.hero_eyebrow?.trim() || `${city} · ${title}`;
  const isPlanned = season.status === "planned" || !formatSeasonWindowLabel(season);
  const robotsMeta = isPlanned
    ? '    <meta name="robots" content="noindex, nofollow" />\n'
    : "";

  const bannerOrHint = isPlanned
    ? `<div class="research-dev-hint" role="note">
          <p>
            <strong>Template only.</strong> Register nodes on your card&apos;s Live panel, set window dates and
            <code>status</code>, then use <strong>Rules page &amp; launch</strong> on
            <a href="/created/">/created/</a> to prepare the public rules page.
          </p>
        </div>`
    : `${buildSeasonBannerBlock(season, jsonUrl, "rules")}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>${escapeHtml(title)} · ${escapeHtml(city)} · humanity.llc</title>
    <meta
      name="description"
      content="${escapeHtml(metaDescription)}"
    />
${robotsMeta}    <meta name="theme-color" content="#ffffff" />
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
        <section class="hero hero-compact">
          <p class="hero-eyebrow">${escapeHtml(heroEyebrow)}</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="hero-line">
            ${heroLine}
          </p>
          <p class="hero-line hero-line-sub" id="city-game-hero-subline">
            <a href="#city-state">Jump to the place list</a> — districts, Open in Maps links (scan stickers for live chips).
          </p>
        </section>

        <section class="idea-section" aria-labelledby="rules-start-title">
          <h2 class="group-label" id="rules-start-title">How to start</h2>
          <ul class="list list-compact" id="city-game-player-guide-list">
            <li class="list-row">
              <span class="list-content">
                <span class="list-sub">Loading start guide…</span>
              </span>
            </li>
          </ul>
        </section>

        ${bannerOrHint}

        <section class="idea-section" aria-labelledby="rules-prove-title">
          <h2 class="group-label" id="rules-prove-title">What a scan proves</h2>
          <ul class="list list-compact">
            <li class="list-row">
              <span class="list-content">
                <span class="list-title">Public object truth</span>
                <span class="list-sub">Live signed state on relays, drops, sanctuaries, and finale nodes — not who scanned.</span>
              </span>
            </li>
            <li class="list-row">
              <span class="list-content">
                <span class="list-title">Cooperation beats hoarding</span>
                <span class="list-sub">Quorum nodes evolve when the group shares clues outward.</span>
              </span>
            </li>
          </ul>
        </section>

        <section class="idea-section" aria-labelledby="rules-not-title">
          <h2 class="group-label" id="rules-not-title">What a scan does not prove</h2>
          <ul class="list list-compact">
            <li class="list-row">
              <span class="list-content">
                <span class="list-title">Who scanned</span>
                <span class="list-sub">No leaderboard, streak, XP, heatmap, or per-player scan history.</span>
              </span>
            </li>
          </ul>
        </section>

        <section
          class="idea-section city-game-map-section"
          id="city-state"
          aria-labelledby="city-state-title"
        >
          <div id="city-game-map-root" class="city-game-map-root" data-season-id="${escapeHtml(seasonId)}">
            <noscript>
              <p class="city-game-map-error">
                City board needs JavaScript. Open
                <a href="${escapeHtml(jsonUrl)}">season data</a>
                or scan any game sticker for live state.
              </p>
            </noscript>
            <p class="city-game-map-loading" aria-live="polite">Loading city state board…</p>
          </div>
        </section>

        <section class="qr-compare idea-compare" aria-labelledby="rules-privacy-title">
          <h2 class="group-label" id="rules-privacy-title">Privacy</h2>
          <p class="group-intro short">
            Read the <a href="/data-policy.html">operator data policy</a>. Same city truth for everyone — no account, no visit log.
          </p>
        </section>

        <p class="idea-footnote">
          <a href="/play/season/">All city games</a>
          ·
          <a href="/what-can-a-qr-do/physical-world-multiplayer/">Physical-world multiplayer research</a>
        </p>
      </main>
    </div>
    <script type="module" src="${PLAY_PAGE_SCRIPT}"></script>
  </body>
</html>
`;
}

/**
 * @param {string} html
 * @param {Record<string, unknown>} season
 */
export function verifyPlayPageHtml(html, season) {
  const issues = [];
  const seasonId = String(season.season_id ?? "").trim();
  if (!seasonId) issues.push("season_id required");
  if (!html.includes(`data-season-id="${seasonId}"`)) {
    issues.push(`missing data-season-id="${seasonId}"`);
  }
  if (!html.includes("city-game-play-page.mjs")) {
    issues.push("missing city-game-play-page.mjs boot script");
  }
  if (!html.includes('id="city-game-map-root"')) {
    issues.push("missing city-game-map-root mount");
  }
  if (!html.includes('id="city-game-player-guide-list"')) {
    issues.push("missing city-game-player-guide-list mount");
  }
  if (!html.includes('id="city-state"')) {
    issues.push("missing #city-state section");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonWantsAutoRulesPage(season) {
  return season.auto_rules_page === true;
}
