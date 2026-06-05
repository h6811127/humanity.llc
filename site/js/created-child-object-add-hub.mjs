import {
  ADD_LOST_ITEM_FOCUS,
  ADD_STATUS_PLATE_FOCUS,
} from "./create-flow-convergence-core.mjs";
import {
  CHILD_OBJECT_ADD_COUNT_ELEMENT_IDS,
  childObjectAddCountLabel,
  childObjectAddHubSubcopy,
  childObjectAddHubSummaryTitle,
  shouldShowChildObjectAddHub,
} from "./created-child-object-add-hub-core.mjs";
import {
  deploySuccessHubSubcopy,
  deploySuccessHubSummaryTitle,
  readDeploySuccessPresentationState,
} from "./created-deploy-success-focus-core.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import { CREATED_ADD_HUB_SUMMARY } from "./created-display-labels-core.mjs";

const ADD_HUB_SECTION_IDS = [
  "child-object-add-status-plate",
  "child-object-add-lost-item",
  "child-object-add-game-node",
];

/** @type {Record<string, string>} */
const ADD_OBJECT_HASH_FOCUS_SECTION_IDS = {
  [ADD_STATUS_PLATE_FOCUS]: "child-object-add-status-plate",
  [ADD_LOST_ITEM_FOCUS]: "child-object-add-lost-item",
};

/**
 * Mount add hub and open it before redirect_live hash focus (#add-status-plate / #add-lost-item).
 * @param {string} focusKey
 */
export function prepareAddObjectHashFocus(focusKey) {
  const sectionId = ADD_OBJECT_HASH_FOCUS_SECTION_IDS[focusKey];
  if (!sectionId) return false;

  mountChildObjectAddHubSections();

  const hub = document.getElementById("child-object-add-hub");
  if (hub instanceof HTMLDetailsElement) {
    hub.hidden = false;
    hub.open = true;
  } else if (hub instanceof HTMLElement) {
    hub.hidden = false;
  }

  const section = document.getElementById(sectionId);
  if (!(section instanceof HTMLElement)) return false;
  section.hidden = false;
  for (const el of section.querySelectorAll("[data-child-object-add-chrome]")) {
    if (el instanceof HTMLElement) el.hidden = false;
  }
  return true;
}

/** Move legacy add sections under the grouped hub (idempotent). */
export function mountChildObjectAddHubSections() {
  const hub = document.getElementById("child-object-add-hub");
  const body = hub?.querySelector(".created-child-add-hub-body");
  if (!body) return;
  for (const id of ADD_HUB_SECTION_IDS) {
    const section = document.getElementById(id);
    if (section && section.parentElement !== body) {
      body.appendChild(section);
    }
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ profileId?: string; activeRoom?: string | null }} [opts]
 */
export function syncChildObjectAddHub(session, opts = {}) {
  mountChildObjectAddHubSections();
  const hub = document.getElementById("child-object-add-hub");
  const sub = document.getElementById("child-object-add-hub-sub");
  const summary = hub?.querySelector(".created-child-object-add-hub-summary");
  const profileId =
    opts.profileId ||
    (typeof session?.profile_id === "string" ? session.profile_id.trim() : "");
  const extras = stewardPresentationExtras(profileId, { activeRoom: opts.activeRoom });
  const show = shouldShowChildObjectAddHub(session, {
    ...extras,
    profileId,
    storage: localStorage,
  });
  if (hub) hub.hidden = !show;
  const deploySuccess = readDeploySuccessPresentationState();
  if (summary) {
    summary.textContent = deploySuccess
      ? deploySuccessHubSummaryTitle(deploySuccess.endpointType)
      : childObjectAddHubSummaryTitle(session, extras) || CREATED_ADD_HUB_SUMMARY;
  }
  if (sub) {
    sub.textContent = deploySuccess
      ? deploySuccessHubSubcopy(deploySuccess.endpointType)
      : childObjectAddHubSubcopy(session, extras) ||
        "sign · lost-item tag";
  }
}

/**
 * @param {"status_plate" | "lost_item_relay" | "game_node"} objectType
 * @param {number} count
 */
export function syncChildObjectAddTypeCount(objectType, count) {
  const id = CHILD_OBJECT_ADD_COUNT_ELEMENT_IDS[objectType];
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const label = childObjectAddCountLabel(count);
  if (label) {
    el.hidden = false;
    el.textContent = label;
  } else {
    el.hidden = true;
    el.textContent = "";
  }
}
