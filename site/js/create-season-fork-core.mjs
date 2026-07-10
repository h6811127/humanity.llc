/**
 * Step 20 slice 4 — season create fork (existing account vs season-only root).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Identity and rooms
 */

import { pickPreferredGeneralRoot } from "./create-flow-convergence-core.mjs";
import {
  isGameSeasonCreateIntent,
  pickPreferredGameSeasonRoot,
} from "./create-organizer-season-core.mjs";

export const GAME_SEASON_ACCOUNT_PARAM = "season_account";
export const GAME_SEASON_FORK_EXISTING = "existing";
export const GAME_SEASON_FORK_DEDICATED = "dedicated";

/** @typedef {"standard" | "redirect_live" | "fork_choose" | "use_existing_account" | "create_dual_skin_root" | "create_season_only_root"} GameSeasonSubmitStrategy */

/**
 * @param {unknown} raw
 * @returns {typeof GAME_SEASON_FORK_EXISTING | typeof GAME_SEASON_FORK_DEDICATED | null}
 */
export function parseGameSeasonForkChoice(raw) {
  if (raw === GAME_SEASON_FORK_EXISTING || raw === GAME_SEASON_FORK_DEDICATED) return raw;
  return null;
}

/**
 * @param {URLSearchParams} searchParams
 */
export function readGameSeasonForkChoice(searchParams) {
  return parseGameSeasonForkChoice(searchParams.get(GAME_SEASON_ACCOUNT_PARAM));
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   walletEntries: unknown[];
 *   gateBypass?: boolean;
 * }} ctx
 * @returns {GameSeasonSubmitStrategy}
 */
export function resolveGameSeasonSubmitStrategy(ctx) {
  if (!isGameSeasonCreateIntent(ctx.searchParams)) return "standard";

  if (ctx.gateBypass) {
    const fork = readGameSeasonForkChoice(ctx.searchParams);
    if (!fork) return "fork_choose";
    if (fork === GAME_SEASON_FORK_EXISTING) return "create_dual_skin_root";
    return "create_season_only_root";
  }

  const seasonRoot = pickPreferredGameSeasonRoot(ctx.walletEntries);
  if (seasonRoot) return "redirect_live";

  const fork = readGameSeasonForkChoice(ctx.searchParams);
  if (!fork) return "fork_choose";

  if (fork === GAME_SEASON_FORK_EXISTING) {
    const deployRoot = pickPreferredGeneralRoot(ctx.walletEntries);
    if (deployRoot) return "use_existing_account";
    return "create_dual_skin_root";
  }

  return "create_season_only_root";
}

/**
 * @param {GameSeasonSubmitStrategy} strategy
 */
export function shouldShowGameSeasonCreateFork(strategy) {
  return strategy === "fork_choose";
}

/**
 * @param {typeof GAME_SEASON_FORK_EXISTING | typeof GAME_SEASON_FORK_DEDICATED} fork
 */
export function gameSeasonForkCardCopy(fork) {
  if (fork === GAME_SEASON_FORK_DEDICATED) {
    return {
      title: "Separate season @handle",
      sub: "New @handle for the season from day one. Best for city seasons, operator handoff, or when signs stay on a different @handle.",
      recommended: "Org / city / operator crew",
    };
  }
  return {
    title: "One @handle for signs and season",
    sub: "Door plates and season scan points share one @handle. Add the season operator key on Live.",
    recommended: "Most people",
  };
}
