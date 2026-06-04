/**
 * WS-SW summer S4 — dual victory visible on board + snapshot (**SW-13**).
 * Canon: docs/CITY_GAME_SUMMER_MOMENTUM.md Lane B #4.
 */

export const SUMMER_S4_DUAL_VICTORY_DISPLAY = {
  board_title: "How the season can end",
  board_intro:
    "Two public outcomes on the same summer network — faction relay majority or cooperative awakening. Everyone sees the same city board; no personal score.",
  network_title: "Signal War · relay majority",
  awakening_title: "Wake the city · cooperative awakening",
};

export const SUMMER_S4_MIN_PATHS = 2;

/**
 * @param {Record<string, unknown>} season
 */
export function validateSeasonSummerS4(season) {
  const issues = [];
  const dual = season.signal_war?.dual_victory;
  if (!dual || typeof dual !== "object") {
    issues.push("signal_war.dual_victory required for SW-13.");
    return { ok: false, issues };
  }

  const fraction = dual.network_majority_relay_fraction;
  if (fraction !== 0.5) {
    issues.push("dual_victory.network_majority_relay_fraction expected 0.5 for summer open.");
  }

  const display = dual.display;
  if (!display || typeof display !== "object") {
    issues.push("dual_victory.display required (board_title, board_intro, path titles).");
    return { ok: false, issues };
  }

  for (const [key, expected] of Object.entries(SUMMER_S4_DUAL_VICTORY_DISPLAY)) {
    if (display[key] !== expected) {
      issues.push(`dual_victory.display.${key} drift — expected canon copy in summer-s4-core.`);
    }
  }

  const s4 = season.signal_war?.summer_s4;
  if (!s4 || s4.dual_victory_visible !== true) {
    issues.push("signal_war.summer_s4.dual_victory_visible must be true.");
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS4(season) {
  const merged = structuredClone(season);
  if (!merged.signal_war || typeof merged.signal_war !== "object") {
    merged.signal_war = {};
  }
  const dual = merged.signal_war.dual_victory ?? {};
  merged.signal_war.dual_victory = {
    ...dual,
    network_majority_relay_fraction: 0.5,
    display: { ...SUMMER_S4_DUAL_VICTORY_DISPLAY },
  };
  merged.signal_war.summer_s4 = { dual_victory_visible: true };
  return merged;
}
