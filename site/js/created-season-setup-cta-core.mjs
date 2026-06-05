/**
 * First-session season setup CTA + checklist focus (P1.2).
 */

import { isFirstControlSessionActive } from "./created-first-session-containment-core.mjs";

export const CREATED_SEASON_SETUP_CTA_LABEL = "Continue season setup";
export const GAME_SEASON_SETUP_DETAILS_ID = "child-object-game-node-setup";
export const GAME_SEASON_SETUP_CHECKLIST_ID = "child-object-game-node-setup-checklist";

/** Operator panels kept collapsed on first season control visit. */
export const SEASON_SETUP_COLLAPSED_OPERATOR_IDS = [
  "child-object-game-node-bulk",
  "child-object-game-node-rules",
];

/** Advanced blocks hidden inside setup checklist on first season visit. */
export const SEASON_SETUP_ADVANCED_INNER_IDS = [
  "child-object-game-node-setup-terminal-notice",
  "child-object-game-node-setup-custody",
  "child-object-game-node-setup-runbook",
  "child-object-game-node-setup-scorecard",
  "child-object-game-node-setup-links",
  "child-object-game-node-setup-copy-brief",
];

/**
 * @param {{
 *   mode: string;
 *   outcomeKind: string;
 *   profileId: string | null | undefined;
 *   sessionStorage?: Pick<Storage, "getItem"> | null;
 * }} ctx
 */
export function shouldShowSeasonSetupCta(ctx) {
  if (ctx.mode !== "control" || ctx.outcomeKind !== "season") return false;
  if (!ctx.profileId) return false;
  return isFirstControlSessionActive(ctx.profileId, ctx.sessionStorage ?? null);
}
