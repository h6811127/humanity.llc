/**
 * Step 20 slice 3 — add vs list presentation policy.
 * Add forms filter by active room; existing children always list with room badge.
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Presentation policy · Add UI vs list UI
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  isActiveLostItemRelayRow,
  isActiveStatusPlateRow,
  isGeneralRootCardSession,
} from "./created-child-object-core.mjs";
import { isActiveGameNodeRow } from "./created-child-object-game-node-core.mjs";
import {
  shouldOfferAddGameNodeInDefaultUi,
  shouldOfferAddLostItemRelayInDefaultUi,
  shouldOfferAddStatusPlateInDefaultUi,
  shouldShowGameNodeSetupRowInDefaultUi,
} from "./steward-presentation-policy-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  stewardActiveRoomLabel,
} from "./steward-active-room-core.mjs";

/** @typedef {"status_plate" | "lost_item_relay" | "game_node"} ChildObjectListType */

/**
 * @param {ChildObjectListType} objectType
 */
export function childObjectTypeHomeRoom(objectType) {
  if (objectType === "game_node") return STEWARD_ROOM_SEASON;
  return STEWARD_ROOM_DOORS;
}

/**
 * @param {ChildObjectListType} objectType
 */
export function childObjectTypeKindLabel(objectType) {
  if (objectType === "lost_item_relay") return "Return tag";
  if (objectType === "game_node") return "Game scan point";
  return "Door plate";
}

/**
 * @param {ChildObjectListType} objectType
 */
export function childObjectListRoomBadgeText(objectType) {
  const kind = childObjectTypeKindLabel(objectType);
  const room = stewardActiveRoomLabel(childObjectTypeHomeRoom(objectType));
  return `${kind} · managed under ${room}`;
}

/**
 * @param {unknown[]} rows
 */
export function countActiveChildObjectsByType(rows) {
  if (!Array.isArray(rows)) {
    return { status_plate: 0, lost_item_relay: 0, game_node: 0 };
  }
  return {
    status_plate: rows.filter(isActiveStatusPlateRow).length,
    lost_item_relay: rows.filter(isActiveLostItemRelayRow).length,
    game_node: rows.filter(isActiveGameNodeRow).length,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {ChildObjectListType} objectType
 * @param {number} activeCount
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowChildObjectTypeSection(session, objectType, activeCount, extras = {}) {
  const canAdd =
    objectType === "status_plate"
      ? shouldOfferAddStatusPlateInDefaultUi(session, extras)
      : objectType === "lost_item_relay"
        ? shouldOfferAddLostItemRelayInDefaultUi(session, extras)
        : shouldOfferAddGameNodeInDefaultUi(session, extras);
  if (canAdd) return true;
  if (!isGeneralRootCardSession(session)) return false;
  return activeCount > 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {ChildObjectListType} objectType
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowChildObjectAddForm(session, objectType, extras = {}) {
  if (objectType === "status_plate") {
    return shouldOfferAddStatusPlateInDefaultUi(session, extras);
  }
  if (objectType === "lost_item_relay") {
    return shouldOfferAddLostItemRelayInDefaultUi(session, extras);
  }
  return shouldOfferAddGameNodeInDefaultUi(session, extras);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} profileId
 * @param {Pick<Storage, "getItem">} storage
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowChildObjectAddHubForRoot(session, profileId, storage, extras = {}) {
  if (!isGeneralRootCardSession(session)) return false;
  const rows = readChildObjectRows(storage, profileId);
  const counts = countActiveChildObjectsByType(rows);
  return (
    shouldShowChildObjectTypeSection(session, "status_plate", counts.status_plate, extras) ||
    shouldShowChildObjectTypeSection(session, "lost_item_relay", counts.lost_item_relay, extras) ||
    shouldShowChildObjectTypeSection(session, "game_node", counts.game_node, extras) ||
    shouldShowGameNodeSetupRowInDefaultUi(session, extras)
  );
}

/**
 * Game node panel: list section and/or season setup checklist (not add chrome).
 *
 * @param {Record<string, unknown> | null | undefined} session
 * @param {number} activeCount
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowChildObjectGameNodePanel(session, activeCount, extras = {}) {
  return (
    shouldShowChildObjectTypeSection(session, "game_node", activeCount, extras) ||
    shouldShowGameNodeSetupRowInDefaultUi(session, extras)
  );
}
