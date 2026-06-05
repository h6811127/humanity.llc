/**
 * Season create fork — submit labels and season-id field visibility.
 */

/** @typedef {import("./create-season-fork-core.mjs").GameSeasonSubmitStrategy} GameSeasonSubmitStrategy */

/**
 * @param {GameSeasonSubmitStrategy} strategy
 */
export function gameSeasonSubmitButtonLabel(strategy) {
  if (strategy === "redirect_live") return "Continue season setup on Live";
  if (strategy === "use_existing_account") return "Continue season setup on Live";
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
        "You already have a season root saved in this browser. Tap below to continue on Live. Enter the season id when you register game nodes.",
      inputRequired: false,
    };
  }
  if (strategy === "use_existing_account") {
    return {
      showSeasonIdField: false,
      redirectHint:
        "Continue on your saved account. Register the game-operator key from Live setup if you have not yet. Enter the season id on your first game node.",
      inputRequired: false,
    };
  }
  if (strategy === "create_dual_skin_root") {
    return {
      showSeasonIdField: false,
      redirectHint:
        "One @handle for door plates and season scan points. Enter the season id when you register your first game node on Live.",
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
