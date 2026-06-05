/**
 * Shared add-vs-list section visibility for /created/ child object panels.
 */

import { deploySuccessSuppressesAddForm } from "./created-deploy-success-focus-core.mjs";
import {
  childObjectListRoomBadgeText,
  shouldShowChildObjectAddForm,
  shouldShowChildObjectTypeSection,
} from "./steward-child-object-list-policy-core.mjs";

/**
 * @param {HTMLElement | null} section
 * @param {import("./steward-child-object-list-policy-core.mjs").ChildObjectListType} objectType
 * @param {Record<string, unknown> | null | undefined} session
 * @param {number} activeCount
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} extras
 */
export function syncChildObjectSectionChrome(section, objectType, session, activeCount, extras) {
  if (!section) return { showSection: false, showAddForm: false };

  const showSection = shouldShowChildObjectTypeSection(session, objectType, activeCount, extras);
  let showAddForm =
    showSection && shouldShowChildObjectAddForm(session, objectType, extras);
  if (deploySuccessSuppressesAddForm(objectType)) {
    showAddForm = false;
  }

  section.hidden = !showSection;

  const addChrome = section.querySelectorAll("[data-child-object-add-chrome]");
  for (const el of addChrome) {
    if (el instanceof HTMLElement) el.hidden = !showAddForm;
  }

  return { showSection, showAddForm };
}

/**
 * @param {HTMLElement} li
 * @param {import("./steward-child-object-list-policy-core.mjs").ChildObjectListType} objectType
 */
export function appendChildObjectListRoomBadge(li, objectType) {
  const content = li.querySelector(".list-content");
  if (!content) return;

  let badge = content.querySelector(".child-object-room-badge");
  if (!(badge instanceof HTMLElement)) {
    badge = document.createElement("span");
    badge.className = "list-sub child-object-room-badge";
    content.append(badge);
  }
  badge.textContent = childObjectListRoomBadgeText(objectType);
}
