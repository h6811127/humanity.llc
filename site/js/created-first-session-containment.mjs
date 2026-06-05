/**
 * DOM sync for first control visit containment on /created/ Live tab.
 */

import {
  isFirstControlSessionActive,
  shouldHideRoomSwitcherForFirstSession,
} from "./created-first-session-containment-core.mjs";
import { CREATED_ADD_HUB_SUMMARY } from "./created-display-labels-core.mjs";
import { SEASON_SETUP_COLLAPSED_OPERATOR_IDS } from "./created-season-setup-cta-core.mjs";
import { hideSeasonSetupAdvancedSections } from "./created-season-setup-cta.mjs";

/**
 * @param {string | null | undefined} profileId
 * @param {{ outcomeKind?: string; deploySuccessLanding?: boolean } | undefined} opts
 */
export function applyFirstSessionContainment(profileId, opts = {}) {
  if (!profileId || !isFirstControlSessionActive(profileId, sessionStorage)) {
    document.body.removeAttribute("data-created-first-session");
    return false;
  }

  document.body.dataset.createdFirstSession = "1";
  const seasonFirstSession = opts.outcomeKind === "season";
  const deploySuccessLanding = opts.deploySuccessLanding === true;

  if (shouldHideRoomSwitcherForFirstSession(profileId, sessionStorage)) {
    const roomWrap = document.getElementById("created-room-switcher-wrap");
    if (roomWrap) roomWrap.hidden = true;
  }

  const addHub = document.getElementById("child-object-add-hub");
  if (addHub instanceof HTMLDetailsElement && !deploySuccessLanding) {
    addHub.removeAttribute("open");
  }
  const addHubSummary = addHub?.querySelector(".created-child-object-add-hub-summary");
  if (addHubSummary) addHubSummary.textContent = CREATED_ADD_HUB_SUMMARY;

  if (seasonFirstSession) {
    for (const id of SEASON_SETUP_COLLAPSED_OPERATOR_IDS) {
      closeDetails(id);
    }
    hideSeasonSetupAdvancedSections();
  } else {
    closeDetails("child-object-game-node-setup");
    closeDetails("child-object-game-node-bulk");
    closeDetails("child-object-game-node-rules");
  }

  for (const id of ["status-plate-loop-scorecard", "lost-item-loop-scorecard"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  return true;
}

/**
 * @param {string} id
 */
function closeDetails(id) {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) {
    el.open = false;
  }
}
