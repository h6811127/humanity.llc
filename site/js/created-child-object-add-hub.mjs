import {
  CHILD_OBJECT_ADD_COUNT_ELEMENT_IDS,
  childObjectAddCountLabel,
  childObjectAddHubSubcopy,
  childObjectAddHubSummaryTitle,
  shouldShowChildObjectAddHub,
} from "./created-child-object-add-hub-core.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import { CREATED_ADD_HUB_SUMMARY } from "./created-display-labels-core.mjs";

const ADD_HUB_SECTION_IDS = [
  "child-object-add-status-plate",
  "child-object-add-lost-item",
  "child-object-add-game-node",
];

let addHubSectionsMounted = false;

/** Move legacy add sections under the grouped hub (once). */
export function mountChildObjectAddHubSections() {
  if (addHubSectionsMounted) return;
  const hub = document.getElementById("child-object-add-hub");
  const body = hub?.querySelector(".created-child-add-hub-body");
  if (!body) return;
  for (const id of ADD_HUB_SECTION_IDS) {
    const section = document.getElementById(id);
    if (section && section.parentElement !== body) {
      body.appendChild(section);
    }
  }
  addHubSectionsMounted = true;
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
  if (summary) {
    summary.textContent = childObjectAddHubSummaryTitle(session, extras) || CREATED_ADD_HUB_SUMMARY;
  }
  if (sub) {
    sub.textContent =
      childObjectAddHubSubcopy(session, extras) ||
      "Add signs, tags, or checkpoints on this account";
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
