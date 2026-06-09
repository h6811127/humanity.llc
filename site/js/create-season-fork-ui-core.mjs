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
    return handle ? `Open ${handle} to set up season` : "Open Live to set up season";
  }
  if (strategy === "create_dual_skin_root") return "Create @handle and continue season setup";
  if (strategy === "create_season_only_root") return "Create season @handle and continue";
  return null;
}

/**
 * Season id on /create/ is removed (Step 20 slice 6). Canonical home: /created/ When panel.
 * @param {GameSeasonSubmitStrategy} strategy
 */
export function gameSeasonIdFieldUiState(_strategy) {
  return {
    showSeasonIdField: false,
    redirectHint:
      "Name your season on Live under When — or when you register your first checkpoint.",
    inputRequired: false,
  };
}
