/**
 * Season create fork — submit labels and season-id field visibility.
 */

import { generalRootDisplayLabel } from "./create-flow-convergence-core.mjs";

/** @typedef {import("./create-season-fork-core.mjs").GameSeasonSubmitStrategy} GameSeasonSubmitStrategy */

/**
 * @param {GameSeasonSubmitStrategy} strategy
 * @param {Record<string, unknown> | null | undefined} [preferredRoot]
 */
export function gameSeasonSubmitButtonLabel(strategy, preferredRoot) {
  const handle =
    preferredRoot && typeof preferredRoot === "object"
      ? generalRootDisplayLabel(preferredRoot)
      : "";
  if (strategy === "redirect_live" || strategy === "use_existing_account") {
    return handle ? `Open ${handle} to set up season` : "Open your account to set up season";
  }
  if (strategy === "create_dual_skin_root") return "Create account and continue season setup";
  if (strategy === "create_season_only_root") return "Create season-only account and continue";
  return null;
}

/**
 * Season id field on /create/?intent=game — hide (not disable) when continuing on Live.
 * @param {GameSeasonSubmitStrategy} strategy
 */
export function gameSeasonIdFieldUiState(strategy) {
  if (strategy === "redirect_live") {
    return {
      showSeasonIdField: false,
      redirectHint:
        "You already have a season account saved on this device. Tap below to continue season setup.",
      inputRequired: false,
    };
  }
  if (strategy === "use_existing_account") {
    return {
      showSeasonIdField: false,
      redirectHint:
        "Continue on your saved account. Name the season when you add your first checkpoint.",
      inputRequired: false,
    };
  }
  if (strategy === "create_dual_skin_root") {
    return {
      showSeasonIdField: false,
      redirectHint:
        "One @name for signs and season scan points. Name the season when you add your first checkpoint.",
      inputRequired: false,
    };
  }
  if (strategy === "create_season_only_root") {
    return {
      showSeasonIdField: true,
      redirectHint: "",
      inputRequired: true,
    };
  }
  return {
    showSeasonIdField: false,
    redirectHint: "",
    inputRequired: false,
  };
}
