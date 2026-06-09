/**
 * Season When panel — season id canonical home on /created/ (Step 20 slice 6 · Q3).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Season cockpit · When
 */

import { parseGameNodeSeasonId } from "./created-child-object-game-node-core.mjs";
import {
  readRememberedGameSeasonId,
  rememberGameSeasonIdForProfile,
} from "./create-organizer-season-core.mjs";

export const SEASON_WHEN_PANEL_ID = "created-season-when-panel";
export const SEASON_WHEN_ID_INPUT_ID = "child-object-season-when-id";

/**
 * @param {string} profileId
 * @param {string} raw
 */
export function persistSeasonWhenId(profileId, raw) {
  const seasonId = parseGameNodeSeasonId(raw);
  rememberGameSeasonIdForProfile(profileId, seasonId);
  return seasonId;
}

/**
 * @param {string} profileId
 */
export function readSeasonWhenId(profileId) {
  return readRememberedGameSeasonId(profileId);
}
