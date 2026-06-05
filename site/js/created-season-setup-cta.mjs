/**
 * First-session season setup CTA on /created/ (P1.2).
 */

import { mountChildObjectAddHubSections } from "./created-child-object-add-hub.mjs";
import {
  CREATED_SEASON_SETUP_CTA_LABEL,
  GAME_SEASON_SETUP_CHECKLIST_ID,
  GAME_SEASON_SETUP_DETAILS_ID,
  SEASON_SETUP_ADVANCED_INNER_IDS,
  shouldShowSeasonSetupCta,
} from "./created-season-setup-cta-core.mjs";
import {
  STEWARD_ROOM_SEASON,
  writePersistedStewardActiveRoom,
} from "./steward-active-room-core.mjs";

export {
  CREATED_SEASON_SETUP_CTA_LABEL,
  GAME_SEASON_SETUP_DETAILS_ID,
  shouldShowSeasonSetupCta,
};

/**
 * Hide advanced operator blocks inside the setup checklist disclosure.
 */
export function hideSeasonSetupAdvancedSections() {
  for (const id of SEASON_SETUP_ADVANCED_INNER_IDS) {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement) el.hidden = true;
  }
  const subhead = document.querySelector(
    `#${GAME_SEASON_SETUP_DETAILS_ID} .created-game-node-setup-subhead`
  );
  if (subhead instanceof HTMLElement) subhead.hidden = true;
  const lead = document.querySelector(
    `#${GAME_SEASON_SETUP_DETAILS_ID} .created-game-node-setup-lead`
  );
  if (lead instanceof HTMLElement) lead.hidden = true;
  for (const el of document.querySelectorAll(
    `#child-object-add-game-node [data-child-object-add-chrome]`
  )) {
    if (el instanceof HTMLElement) el.hidden = true;
  }
}

/**
 * Open and scroll to the existing season setup checklist.
 * @param {string | null | undefined} profileId
 * @returns {HTMLElement | null}
 */
export function focusSeasonSetupChecklist(profileId) {
  mountChildObjectAddHubSections();
  if (profileId) {
    writePersistedStewardActiveRoom(profileId, STEWARD_ROOM_SEASON);
  }

  const hub = document.getElementById("child-object-add-hub");
  const gameSection = document.getElementById("child-object-add-game-node");
  const setupDetails = document.getElementById(GAME_SEASON_SETUP_DETAILS_ID);

  if (hub instanceof HTMLElement) {
    hub.hidden = false;
    if (hub instanceof HTMLDetailsElement) {
      hub.open = true;
    }
  }
  if (gameSection instanceof HTMLElement) {
    gameSection.hidden = false;
  }
  hideSeasonSetupAdvancedSections();

  if (setupDetails instanceof HTMLDetailsElement) {
    setupDetails.hidden = false;
    setupDetails.open = true;
    setupDetails.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const checklist = document.getElementById(GAME_SEASON_SETUP_CHECKLIST_ID);
  return checklist instanceof HTMLElement ? checklist : setupDetails instanceof HTMLElement ? setupDetails : null;
}

/**
 * @param {{
 *   mode: string;
 *   outcomeKind: string;
 *   profileId: string | null | undefined;
 *   sessionStorage?: Pick<Storage, "getItem"> | null;
 * }} ctx
 */
export function syncCreatedSeasonSetupCta(ctx) {
  const btn = document.getElementById("created-season-setup-cta");
  if (!(btn instanceof HTMLButtonElement)) return;
  const show = shouldShowSeasonSetupCta(ctx);
  btn.hidden = !show;
  if (show) {
    btn.textContent = CREATED_SEASON_SETUP_CTA_LABEL;
  }
}

/**
 * @param {() => void} onClick
 */
export function wireCreatedSeasonSetupCtaClick(onClick) {
  const btn = document.getElementById("created-season-setup-cta");
  if (!(btn instanceof HTMLButtonElement) || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", onClick);
}
