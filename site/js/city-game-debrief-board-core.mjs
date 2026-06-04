/**
 * Debrief CTA on the city board (**SW-14**).
 */
import { resolveDebriefPath, shouldGateDebriefPatterns } from "./city-game-debrief-core.mjs";
import { resolveSeasonWindowPhase } from "./city-game-season-banner-core.mjs";

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
 * @param {Date} [now]
 */
export function shouldShowDebriefBoardCta(season, now = new Date()) {
  const phase = resolveSeasonWindowPhase(now, season);
  if (phase === "after" || season.status === "ended") return true;
  return Boolean(season.debrief_path?.trim());
}

/**
 * @param {Record<string, unknown>} season
 * @param {Date} [now]
 */
export function buildDebriefBoardCtaHtml(season, now = new Date()) {
  const href = resolveDebriefPath(season);
  const phase = resolveSeasonWindowPhase(now, season);
  const gated = shouldGateDebriefPatterns(phase, season);

  if (phase === "after" || season.status === "ended") {
    return `<section
    class="city-game-map-debrief"
    id="city-game-map-debrief"
    aria-labelledby="city-game-map-debrief-title"
  >
  <h3 class="group-label" id="city-game-map-debrief-title">Season debrief</h3>
  <p class="group-intro short city-game-map-debrief-intro">
    The window has closed. Read public outcomes and named coordination patterns from the same snapshot the board used — not a personal scoreboard.
  </p>
  <p><a class="btn btn-secondary" href="${escapeHtml(href)}">Open season debrief</a></p>
</section>`;
  }

  const teaser = gated
    ? "After the window closes, the debrief names public-goods, commons, and coordination patterns — without a lecture during play."
    : "Read how the season ended on the debrief page.";

  return `<section
    class="city-game-map-debrief city-game-map-debrief--pending"
    id="city-game-map-debrief"
    aria-labelledby="city-game-map-debrief-title"
  >
  <h3 class="group-label" id="city-game-map-debrief-title">After the season</h3>
  <p class="group-intro short city-game-map-debrief-intro">${escapeHtml(teaser)}</p>
  <p><a href="${escapeHtml(href)}">Season debrief</a> (preview outcomes anytime)</p>
</section>`;
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} season
 * @param {Date} [now]
 */
export function applyDebriefBoardCta(boardRoot, season, now = new Date()) {
  const mount = boardRoot.querySelector("#city-game-map-debrief-mount");
  if (!(mount instanceof HTMLElement)) return;

  if (!shouldShowDebriefBoardCta(season, now)) {
    mount.hidden = true;
    mount.setAttribute("aria-hidden", "true");
    mount.replaceChildren();
    return;
  }

  mount.innerHTML = buildDebriefBoardCtaHtml(season, now);
  mount.hidden = false;
  mount.removeAttribute("aria-hidden");
}
