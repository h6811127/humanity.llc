import {
  shouldOfferAddLostItemRelay,
  shouldOfferAddStatusPlate,
} from "./created-child-object-core.mjs";
import { shouldOfferAddGameNode, shouldShowGameNodeAddRow } from "./created-child-object-game-node-core.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowChildObjectAddHub(session) {
  return (
    shouldOfferAddStatusPlate(session) ||
    shouldOfferAddLostItemRelay(session) ||
    shouldOfferAddGameNode(session) ||
    shouldShowGameNodeAddRow(session)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function childObjectAddHubTypeLabels(session) {
  /** @type {string[]} */
  const labels = [];
  if (shouldOfferAddStatusPlate(session)) labels.push("status plates");
  if (shouldOfferAddLostItemRelay(session)) labels.push("lost items");
  if (shouldOfferAddGameNode(session)) labels.push("game nodes");
  else if (shouldShowGameNodeAddRow(session)) labels.push("game nodes (setup)");
  return labels;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function childObjectAddHubSubcopy(session) {
  const labels = childObjectAddHubTypeLabels(session);
  if (!labels.length) return "";
  return labels.join(" · ");
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
