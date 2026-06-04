/**
 * Dual victory panel on the city board (**SW-13**).
 * @see docs/CITY_GAME_SUMMER_MOMENTUM.md Lane B #4
 */

const STATUS_LABELS = {
  achieved: "Live on the board",
  in_progress: "In progress",
  pending: "Not yet",
};

/**
 * @param {unknown} signalWar
 */
export function parseDualVictoryFromSnapshot(signalWar) {
  if (!signalWar || typeof signalWar !== "object") return null;
  const block = /** @type {Record<string, unknown>} */ (signalWar);
  const dual =
    block.dual_victory && typeof block.dual_victory === "object"
      ? /** @type {Record<string, unknown>} */ (block.dual_victory)
      : null;
  if (!dual || !Array.isArray(dual.paths) || !dual.paths.length) return null;
  return dual;
}

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
 * @param {Record<string, unknown>} dual
 */
export function buildDualVictoryPanelHtml(dual) {
  const title =
    typeof dual.board_title === "string" && dual.board_title.trim()
      ? dual.board_title.trim()
      : "How the season can end";
  const intro =
    typeof dual.board_intro === "string" && dual.board_intro.trim()
      ? dual.board_intro.trim()
      : "Two public outcomes on the same network — city state for everyone, not a personal score.";

  const paths = dual.paths
    .filter((row) => row && typeof row === "object")
    .map((row) => /** @type {Record<string, unknown>} */ (row));

  const items = paths
    .map((path) => {
      const id = String(path.id ?? "path");
      const status =
        path.status === "achieved" ||
        path.status === "in_progress" ||
        path.status === "pending"
          ? path.status
          : "pending";
      const statusLabel = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
      const pathTitle = String(path.title ?? "Path").trim();
      const detail = String(path.detail ?? "").trim();
      return `<li class="city-game-dual-victory-path city-game-dual-victory-path--${escapeHtml(status)}" data-path="${escapeHtml(id)}">
  <div class="city-game-dual-victory-path-head">
    <strong class="city-game-dual-victory-path-title">${escapeHtml(pathTitle)}</strong>
    <span class="city-game-dual-victory-path-status">${escapeHtml(statusLabel)}</span>
  </div>
  <p class="city-game-dual-victory-path-detail">${escapeHtml(detail)}</p>
</li>`;
    })
    .join("");

  return `<section
    class="city-game-map-dual-victory"
    id="city-game-map-dual-victory"
    aria-labelledby="city-game-map-dual-victory-title"
  >
  <h3 class="group-label" id="city-game-map-dual-victory-title">${escapeHtml(title)}</h3>
  <p class="group-intro short city-game-map-dual-victory-intro">${escapeHtml(intro)}</p>
  <ul class="city-game-dual-victory-paths" aria-label="Season victory paths">
    ${items}
  </ul>
</section>`;
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function shouldShowDualVictoryPanel(snapshot) {
  return parseDualVictoryFromSnapshot(snapshot?.signal_war) != null;
}
