/**
 * Scroll helper for sign add section (hash focus and legacy callers).
 */

import { mountChildObjectAddHubSections } from "./created-child-object-add-hub.mjs";
import { deploySuccessSuppressesAddForm } from "./created-deploy-success-focus-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  writePersistedStewardActiveRoom,
} from "./steward-active-room-core.mjs";

/** @type {readonly string[]} */
export const SIGN_ADD_SECTION_IDS = ["child-object-add-hub", "child-object-add-status-plate"];

/**
 * Open add hub and reveal sign add form for first-session CTA.
 * @param {string | null | undefined} profileId
 * @returns {HTMLElement | null} Sign add section when focused
 */
export function focusSignAddSection(profileId) {
  mountChildObjectAddHubSections();
  const hub = document.getElementById("child-object-add-hub");
  const section = document.getElementById("child-object-add-status-plate");
  if (profileId) {
    writePersistedStewardActiveRoom(profileId, STEWARD_ROOM_DOORS);
  }
  if (hub instanceof HTMLElement) {
    hub.hidden = false;
    if (hub instanceof HTMLDetailsElement) {
      hub.open = true;
    }
  }
  if (section instanceof HTMLElement) {
    section.hidden = false;
    if (!deploySuccessSuppressesAddForm("status_plate")) {
      for (const el of section.querySelectorAll("[data-child-object-add-chrome]")) {
        if (el instanceof HTMLElement) el.hidden = false;
      }
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return section instanceof HTMLElement ? section : null;
}
