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
 * }} ctx
 * @returns {GameSeasonSubmitStrategy}
 */
export function resolveGameSeasonSubmitStrategy(ctx) {
  if (!isGameSeasonCreateIntent(ctx.searchParams)) return "standard";

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
      title: "Create a season-only account",
      sub: "New @handle with a season manifesto from day one. Best for city seasons, operator handoff, or when deploy scan points stay on a different identity.",
      recommended: "Org / city / operator crew",
    };
  }
  return {
    title: "Use my existing account",
    sub: "Keep one @handle for door plates and season scan points. Add the game-operator key on this identity (recommended for solo stewards and small seasons).",
    recommended: "Most people",
  };
}
