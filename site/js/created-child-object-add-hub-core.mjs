import {
  shouldOfferAddGameNodeInDefaultUi,
  shouldOfferAddLostItemRelayInDefaultUi,
  shouldOfferAddStatusPlateInDefaultUi,
  shouldShowGameNodeSetupRowInDefaultUi,
  stewardChildObjectAddHubSubcopy,
  stewardChildObjectAddHubSummaryTitle,
} from "./steward-presentation-policy-core.mjs";
import { shouldShowChildObjectAddHubForRoot } from "./steward-child-object-list-policy-core.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{
 *   activeRoom?: string | null;
 *   profileId?: string;
 *   storage?: Pick<Storage, "getItem">;
 * }} [extras]
 */
export function shouldShowChildObjectAddHub(session, extras = {}) {
  const profileId = typeof extras.profileId === "string" ? extras.profileId.trim() : "";
  const storage =
    extras.storage ??
    (typeof localStorage !== "undefined" ? localStorage : null);
  if (!profileId || !storage) return false;
  return shouldShowChildObjectAddHubForRoot(session, profileId, storage, extras);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null }} [extras]
 */
export function childObjectAddHubTypeLabels(session, extras = {}) {
  /** @type {string[]} */
  const labels = [];
  if (shouldOfferAddStatusPlateInDefaultUi(session, extras)) labels.push("sign");
  if (shouldOfferAddLostItemRelayInDefaultUi(session, extras)) labels.push("lost-item tag");
  if (shouldOfferAddGameNodeInDefaultUi(session, extras)) labels.push("checkpoints");
  else if (shouldShowGameNodeSetupRowInDefaultUi(session, extras)) {
    labels.push("checkpoints (setup)");
  }
  return labels;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null }} [extras]
 */
export function childObjectAddHubSubcopy(session, extras = {}) {
  return stewardChildObjectAddHubSubcopy(session, extras);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null }} [extras]
 */
export function childObjectAddHubSummaryTitle(session, extras = {}) {
  return stewardChildObjectAddHubSummaryTitle(session, extras);
}

/**
 * @param {number} count
 */
export function childObjectAddCountLabel(count) {
  if (count <= 0) return null;
  return count === 1 ? "1 registered" : `${count} registered`;
}

/** @type {Record<string, string>} */
export const CHILD_OBJECT_ADD_COUNT_ELEMENT_IDS = {
  status_plate: "child-object-add-status-plate-count",
  lost_item_relay: "child-object-add-lost-item-count",
  game_node: "child-object-add-game-node-count",
};
