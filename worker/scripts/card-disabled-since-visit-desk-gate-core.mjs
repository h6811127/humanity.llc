/**
 * P0b-1 desk gate helpers — card disabled since visit (R10).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md
 */

export const P0B1_DESK_GATE_DOC = "docs/SAFARI_KEYS_WIPE_INVESTIGATION.md";
export const P0B1_QA_DOC = "docs/DEVICE_OS_QA.md";
export const P0B1_QA_SECTION = "P1-P0b-1";

/**
 * @returns {string[]}
 */
export function cardDisabledSinceVisitDeskGateHumanNextSteps() {
  return [
    "",
    "Human next (prod WebKit on https://humanity.llc after deploy):",
    "",
    "  1. Fresh create → save on device → finish setup",
    "  2. Open hub on `/` within the same Safari session",
    "  3. Confirm NO “Card disabled on the network since your last visit” on an active card",
    "",
    "  Manual QA: docs/DEVICE_OS_QA.md § P1-P0b-1",
    "",
    "  Sign-off when done:",
    "  npm run card-disabled-since-visit:sign-off -- --pass --apply --date YYYY-MM-DD --device \"iPhone Safari\"",
    "",
  ];
}
