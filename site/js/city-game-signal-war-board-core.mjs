/**
 * Signal War board helpers — faction network totals from snapshot (**SW-07**).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

/** @type {Record<string, string>} */
export const FACTION_BOARD_LABELS = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
};

/** @type {readonly string[]} */
export const FACTION_BOARD_ORDER = ["red", "blue", "green", "yellow"];

/**
 * @param {unknown} signalWar
 */
export function parseSignalWarBlock(signalWar) {
  if (!signalWar || typeof signalWar !== "object") return null;
  return /** @type {Record<string, unknown>} */ (signalWar);
}

/**
 * @param {Record<string, unknown> | null} signalWar
 */
export function parseFactionNetworkPoints(signalWar) {
  const raw = signalWar?.faction_network_points;
  if (!raw || typeof raw !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (raw);
  return {
    red: Math.max(0, Number(row.red) || 0),
    blue: Math.max(0, Number(row.blue) || 0),
    green: Math.max(0, Number(row.green) || 0),
    yellow: Math.max(0, Number(row.yellow) || 0),
  };
}

/**
 * @param {Record<string, number>} points
 * @param {string | null | undefined} dominantFaction
 */
export function buildFactionTotalsHtml(points, dominantFaction) {
  return FACTION_BOARD_ORDER.map((faction) => {
    const score = points[faction] ?? 0;
    const leader =
      dominantFaction === faction && score > 0
        ? " city-game-map-faction-total--leader"
        : "";
    const label = FACTION_BOARD_LABELS[faction] ?? faction;
    return `<li class="city-game-map-faction-total${leader}" data-faction="${faction}">
  <span class="city-game-map-faction-total-label">${label}</span>
  <span class="city-game-map-faction-total-value">${score}</span>
</li>`;
  }).join("");
}

/**
 * @param {Record<string, unknown> | null} signalWar
 */
export function signalWarDualVictoryLines(signalWar) {
  const dual =
    signalWar?.dual_victory && typeof signalWar.dual_victory === "object"
      ? /** @type {Record<string, unknown>} */ (signalWar.dual_victory)
      : null;
  if (!dual || !Array.isArray(dual.summary_lines)) return [];
  return dual.summary_lines.map((line) => String(line).trim()).filter(Boolean);
}

/**
 * Headline lines for the board — dual victory first, then network summary.
 * @param {Record<string, unknown>} snapshot
 */
export function buildSignalWarBoardLines(snapshot) {
  const signalWar = parseSignalWarBlock(snapshot?.signal_war);
  if (!signalWar) return [];

  const seen = new Set();
  /** @type {string[]} */
  const lines = [];

  for (const line of signalWarDualVictoryLines(signalWar)) {
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }

  if (Array.isArray(signalWar.summary_lines)) {
    for (const line of signalWar.summary_lines) {
      const text = String(line).trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      lines.push(text);
    }
  }

  return lines;
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function shouldShowSignalWarBoard(snapshot) {
  const signalWar = parseSignalWarBlock(snapshot?.signal_war);
  if (!signalWar) return false;
  if (parseFactionNetworkPoints(signalWar)) return true;
  if (buildSignalWarBoardLines(snapshot).length) return true;
  return false;
}
