/**
 * Pure helpers for /created/ Collection shelf (PR 1 commit 2).
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  isActiveLostItemRelayRow,
  isActiveStatusPlateRow,
} from "./created-child-object-core.mjs";
import { isActiveGameNodeRow } from "./created-child-object-game-node-core.mjs";
import { formatCreatedHandleLabel } from "./created-display-labels-core.mjs";
import { hubChildObjectTitle } from "./hub-child-object-row-core.mjs";
import {
  childObjectTypeHomeRoom,
  childObjectTypeKindLabel,
} from "./steward-child-object-list-policy-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  STEWARD_ROOM_WEAR,
  stewardActiveRoomLabel,
} from "./steward-active-room-core.mjs";

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveCollectionChildRow(row) {
  return (
    isActiveStatusPlateRow(row) ||
    isActiveLostItemRelayRow(row) ||
    isActiveGameNodeRow(row)
  );
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 */
export function listActiveCollectionChildRows(storage, profileId) {
  return readChildObjectRows(storage, profileId).filter(isActiveCollectionChildRow);
}

/**
 * @param {string} objectType
 * @param {string | null | undefined} activeRoom
 */
export function collectionCrossRoomBadge(objectType, activeRoom) {
  const type = typeof objectType === "string" ? objectType.trim() : "";
  if (!type || !activeRoom) return null;
  const homeRoom = childObjectTypeHomeRoom(
    /** @type {"status_plate" | "lost_item_relay" | "game_node"} */ (type)
  );
  if (homeRoom === activeRoom) return null;
  return stewardActiveRoomLabel(homeRoom);
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @param {string | null | undefined} activeRoom
 */
export function compareCollectionShelfRows(a, b, activeRoom) {
  const room = activeRoom || STEWARD_ROOM_DOORS;
  const aHome = childObjectTypeHomeRoom(
    /** @type {"status_plate" | "lost_item_relay" | "game_node"} */ (
      String(a.object_type ?? "")
    )
  );
  const bHome = childObjectTypeHomeRoom(
    /** @type {"status_plate" | "lost_item_relay" | "game_node"} */ (
      String(b.object_type ?? "")
    )
  );
  const aRank = aHome === room ? 0 : 1;
  const bRank = bHome === room ? 0 : 1;
  if (aRank !== bRank) return aRank - bRank;
  return hubChildObjectTitle(a).localeCompare(hubChildObjectTitle(b), undefined, {
    sensitivity: "base",
  });
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string | null | undefined} activeRoom
 */
export function listCollectionShelfRows(rows, activeRoom) {
  const active = rows.filter(isActiveCollectionChildRow);
  return [...active].sort((a, b) => compareCollectionShelfRows(a, b, activeRoom));
}

/**
 * @param {string | null | undefined} activeRoom
 */
export function collectionAddPassLabel(activeRoom) {
  if (activeRoom === STEWARD_ROOM_WEAR) return "Add wear QR";
  if (activeRoom === STEWARD_ROOM_SEASON) return "Add checkpoint";
  return "Add scan point";
}

/**
 * @param {Record<string, unknown>} row
 */
export function collectionRowTypeBadge(objectType) {
  const type = typeof objectType === "string" ? objectType.trim() : "";
  if (
    type === "status_plate" ||
    type === "lost_item_relay" ||
    type === "game_node"
  ) {
    return childObjectTypeKindLabel(
      /** @type {"status_plate" | "lost_item_relay" | "game_node"} */ (type)
    );
  }
  return "Object";
}

/**
 * @param {Record<string, unknown>} row
 */
export function collectionRowRecencyLabel(row) {
  const raw =
    typeof row.updated_at === "string"
      ? row.updated_at
      : typeof row.created_at === "string"
        ? row.created_at
        : null;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return `Updated ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string | null | undefined} activeRoom
 */
export function collectionRowIdentityLabel(row, activeRoom) {
  const type = typeof row.object_type === "string" ? row.object_type : "";
  const parts = [collectionRowTypeBadge(type)];
  const cross = collectionCrossRoomBadge(type, activeRoom);
  if (cross) parts.push(cross);
  const recency = collectionRowRecencyLabel(row);
  if (recency) parts.push(recency);
  return parts.join(" · ");
}

/**
 * @param {{
 *   handle?: string | null;
 *   activeChildCount?: number;
 *   backupSatisfied?: boolean;
 *   reachabilityLine?: string | null;
 * }} input
 */
export function accountStripSummary(input) {
  const handleLabel = formatCreatedHandleLabel(input.handle ?? null);
  const count = Number(input.activeChildCount) || 0;
  const heading = handleLabel ? `Managing ${handleLabel}` : "Managing this account";
  const countLabel = count === 1 ? "1 scan point" : `${count} scan points`;
  const backupLine = input.backupSatisfied
    ? "Backup on this device"
    : "No backup on this device yet";
  /** @type {string[]} */
  const metaParts = [countLabel];
  const reachability =
    typeof input.reachabilityLine === "string" ? input.reachabilityLine.trim() : "";
  if (reachability) metaParts.push(reachability);

  return {
    heading,
    metaLine: metaParts.join(" · "),
    backupLine,
  };
}

/**
 * @param {string} profileId
 * @param {string} objectId
 * @param {Pick<URLSearchParams, "get">} [searchParams]
 */
export function createdCollectionFocusedUrl(profileId, objectId, searchParams) {
  const params = new URLSearchParams();
  params.set("profile_id", profileId);
  params.set("object_id", objectId);
  if (searchParams) {
    const qrId = searchParams.get("qr_id")?.trim();
    if (qrId) params.set("qr_id", qrId);
  }
  return `/created/?${params.toString()}`;
}
