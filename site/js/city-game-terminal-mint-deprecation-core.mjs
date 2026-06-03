/**
 * Terminal mint deprecation — pilot/CI only; self-serve uses /created/.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · terminal mint deprecation
 */

export const PILOT_TERMINAL_MINT_SEASON_ID = "cr_season_01_wake";
export const PILOT_TERMINAL_MINT_RULES_SLUG = "cedar-rapids";
export const SELF_SERVE_SETUP_PATH = "/created/";
export const SELF_SERVE_SETUP_ANCHOR = "#child-object-add-game-node";

/** @typedef {'pilot' | 'self_serve' | 'unknown'} TerminalMintAudience */

/**
 * @param {Record<string, unknown>} season
 */
export function isPilotTerminalMintSeason(season) {
  if (season?.pilot_terminal_mint === true) return true;
  if (season?.pilot_terminal_mint === false) return false;
  const seasonId = String(season?.season_id ?? "").trim();
  if (seasonId === PILOT_TERMINAL_MINT_SEASON_ID) return true;
  const slug = seasonSlugFromSeason(season);
  return slug === PILOT_TERMINAL_MINT_RULES_SLUG;
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonSlugFromSeason(season) {
  const rulesPath = String(season?.rules_path ?? "").trim();
  const match = rulesPath.match(/^\/play\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonUsesSelfServeSetup(season) {
  return season?.auto_rules_page === true && !isPilotTerminalMintSeason(season);
}

/**
 * @param {Record<string, unknown>} season
 * @returns {TerminalMintAudience}
 */
export function terminalMintAudience(season) {
  if (isPilotTerminalMintSeason(season)) return "pilot";
  if (seasonUsesSelfServeSetup(season)) return "self_serve";
  return "unknown";
}

/**
 * @param {Record<string, unknown>} [opts]
 */
export function selfServeSetupUrl(opts = {}) {
  const base = opts.pagesOrigin?.replace(/\/$/, "") ?? "";
  return `${base}${SELF_SERVE_SETUP_PATH}${SELF_SERVE_SETUP_ANCHOR}`;
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   scriptName: string;
 *   force?: boolean;
 *   ci?: boolean;
 * }} input
 */
export function assessTerminalMintCliAccess(input) {
  const audience = terminalMintAudience(input.season);
  const forced =
    input.force === true ||
    input.ci === true ||
    (typeof process !== "undefined" && process.env?.CI === "true");

  if (audience === "pilot") {
    return {
      allowed: true,
      audience,
      forced: false,
      notice: null,
      blockMessage: null,
    };
  }

  if (audience === "self_serve" && !forced) {
    return {
      allowed: false,
      audience,
      forced: false,
      notice: formatTerminalMintDeprecationNotice(input),
      blockMessage: formatTerminalMintBlockMessage(input),
    };
  }

  return {
    allowed: true,
    audience,
    forced,
    notice:
      audience === "self_serve"
        ? formatTerminalMintDeprecationNotice(input)
        : formatTerminalMintUnknownSeasonNotice(input),
    blockMessage: null,
  };
}

/**
 * @param {{ season: Record<string, unknown>; scriptName: string; force?: boolean; ci?: boolean }} input
 */
export function formatTerminalMintDeprecationNotice(input) {
  const city = String(input.season.city ?? input.season.season_id ?? "this season").trim();
  const lines = [
    "⚠ Terminal mint is deprecated for self-serve seasons.",
    `  Season: ${input.season.season_id} (${city})`,
    `  Script: ${input.scriptName}`,
    "",
    "  Organizers register game nodes in the browser:",
    `  ${SELF_SERVE_SETUP_PATH} Live · Manage → Add game node under this root`,
    "  (bulk import starter registry · issue scan QRs · rules publish)",
    "",
    "  Terminal mint remains for Cedar Rapids pilot ops, CI, and engineering fixtures.",
  ];
  if (input.force || input.ci) {
    lines.push("", "  Continuing because --force / --ci / CI=1.");
  }
  return lines.join("\n");
}

/**
 * @param {{ season: Record<string, unknown>; scriptName: string }} input
 */
export function formatTerminalMintBlockMessage(input) {
  return [
    `Blocked: ${input.scriptName} is not supported for self-serve season ${input.season.season_id}.`,
    `Use ${SELF_SERVE_SETUP_PATH} (game season setup on your season root card).`,
    "Re-run with --force only for CI/fixture template export.",
  ].join("\n");
}

/**
 * @param {{ season: Record<string, unknown>; scriptName: string }} input
 */
export function formatTerminalMintUnknownSeasonNotice(input) {
  return [
    `Note: ${input.scriptName} targets season ${input.season.season_id}.`,
    "If this is a new public season, prefer browser setup on /created/ Live.",
    "Pilot terminal mint is Cedar Rapids S1 only unless season JSON sets pilot_terminal_mint: true.",
  ].join("\n");
}

/**
 * Product copy for /created/ setup panel.
 */
export function terminalMintDeprecationUiCopy() {
  return {
    title: "Browser setup replaces terminal mint",
    body:
      "Register nodes, issue scan QRs, bulk-import the starter registry, and prepare rules from this card. Do not run city-game:mint-node or city-game:seed-local for new self-serve seasons.",
    pilot:
      "Cedar Rapids pilot ops and engineering CI may still use terminal scripts — see CITY_GAME_LOCAL_DEV.md.",
  };
}

/**
 * @param {{ pilot?: boolean; selfServe?: boolean }} [opts]
 */
export function formatSeasonSetupNextSteps(opts = {}) {
  const lines = [];
  if (opts.selfServe !== false) {
    lines.push(
      "Self-serve organizers:",
      "  1. /create/ — season root card + game-operator public key (Organizer / issuer)",
      "  2. /created/ Live · Manage — Add game node · bulk import · rules publish",
      "  3. /game-operator/ — weekend world-state console (session-only private key)"
    );
  }
  if (opts.pilot !== false) {
    lines.push(
      "Cedar Rapids pilot / engineering:",
      "  npm run city-game:season-root",
      "  npm run city-game:mint-node -- --all   # pilot season only",
      "  npm run city-game:seed-local -- --write-season"
    );
  }
  return lines.join("\n");
}
