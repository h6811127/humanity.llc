/**
 * Pure helpers for /created/ Focused Object front (PR 1 commit 3).
 */

import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  parseLostItemRelayChildFields,
  parseStatusPlateChildFields,
} from "./created-child-object-core.mjs";
import {
  CHILD_OBJECT_TYPE_GAME_NODE,
  isActiveGameNodeRow,
} from "./created-child-object-game-node-core.mjs";
import { collectionCrossRoomBadge, collectionRowRecencyLabel } from "./created-collection-core.mjs";
import { CREATED_VIEW_FOCUSED_OBJECT } from "./created-collection-route-core.mjs";
import { LOST_ITEM_RELAY_PREFIX, inferPilotTemplate } from "./manifesto-display.mjs";
import {
  hubChildObjectStatusLine,
  hubChildObjectTitle,
} from "./hub-child-object-row-core.mjs";
import { collectionRowTypeBadge } from "./created-collection-core.mjs";

export const FOCUSED_OBJECT_STALE_MESSAGE = "Scan point not found";
export const FOCUSED_OBJECT_BACK_LABEL = "Back to scan points";
export const FOCUSED_OBJECT_PUBLISH_LABEL = "Publish update";
export const FOCUSED_OBJECT_OPEN_SCAN_LABEL = "Open scan page";
export const FOCUSED_OBJECT_COPY_SCAN_LABEL = "Copy scan link";
export const FOCUSED_OBJECT_GAME_NODE_READONLY_NOTE =
  "Checkpoint place and status are managed under Season tools for now.";

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string | null | undefined} objectId
 */
export function findFocusedChildRow(rows, objectId) {
  const id = typeof objectId === "string" ? objectId.trim() : "";
  if (!id) return null;
  return (
    rows.find(
      (row) =>
        row?.status !== "disabled" && String(row.object_id ?? "") === id
    ) ?? null
  );
}

/**
 * @param {{
 *   landing: { view: string; objectId?: string | null; collapsedRoot?: boolean };
 *   childRows: Record<string, unknown>[];
 *   session?: Record<string, unknown> | null;
 * }} input
 * @returns {{ mode: "child"; row: Record<string, unknown> } | { mode: "root"; pilot: string } | null}
 */
export function resolveFocusedObjectTarget(input) {
  if (input.landing.view !== CREATED_VIEW_FOCUSED_OBJECT) return null;
  if (input.landing.objectId) {
    const row = findFocusedChildRow(input.childRows, input.landing.objectId);
    return row ? { mode: "child", row } : null;
  }
  if (input.landing.collapsedRoot) {
    const session = input.session ?? {};
    const pilot =
      typeof session.pilot_template === "string" && session.pilot_template.trim()
        ? session.pilot_template.trim()
        : inferPilotTemplate(
            typeof session.manifesto_line === "string" ? session.manifesto_line : ""
          );
    return { mode: "root", pilot };
  }
  return null;
}

/**
 * @param {unknown} objectType
 */
export function canPublishFocusedObjectType(objectType) {
  const type = typeof objectType === "string" ? objectType.trim() : "";
  return (
    type === CHILD_OBJECT_TYPE_STATUS_PLATE ||
    type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {string | null | undefined} activeRoom
 */
export function focusedObjectFieldsForRow(row, activeRoom) {
  const objectType = typeof row.object_type === "string" ? row.object_type : "";
  const scanUrl = typeof row.scan_url === "string" ? row.scan_url : "";
  const status = hubChildObjectStatusLine({
    publicState: row.public_state,
    scanUrl,
    status: row.status,
  });
  const typeBadge = collectionRowTypeBadge(objectType);
  const roomBadge = collectionCrossRoomBadge(objectType, activeRoom);
  const recency = collectionRowRecencyLabel(row);

  /** @type {Array<{ name: string; label: string; value: string; readonly?: boolean; multiline?: boolean }>} */
  const fields = [];

  if (objectType === CHILD_OBJECT_TYPE_STATUS_PLATE) {
    fields.push(
      {
        name: "public_label",
        label: "Object name",
        value: String(row.public_label ?? ""),
      },
      {
        name: "public_state",
        label: "Status line",
        value: String(row.public_state ?? ""),
      }
    );
  } else if (objectType === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY) {
    fields.push(
      {
        name: "public_label",
        label: "Item name",
        value: String(row.public_label ?? ""),
      },
      {
        name: "public_state",
        label: "Return message",
        value: String(row.public_state ?? ""),
        multiline: true,
      }
    );
  } else if (objectType === CHILD_OBJECT_TYPE_GAME_NODE) {
    fields.push(
      {
        name: "public_label",
        label: "Place name",
        value: String(row.public_label ?? ""),
        readonly: true,
      },
      {
        name: "public_state",
        label: "Status line",
        value: String(row.public_state ?? ""),
        readonly: true,
      }
    );
  }

  return {
    title: hubChildObjectTitle(row),
    typeBadge,
    roomBadge,
    statusLabel: status.label,
    statusTone: status.tone,
    recency,
    fields,
    publishMode: "child",
    objectType,
    scanUrl: scanUrl || null,
    canPublish: canPublishFocusedObjectType(objectType),
    readOnlyNote:
      objectType === CHILD_OBJECT_TYPE_GAME_NODE
        ? FOCUSED_OBJECT_GAME_NODE_READONLY_NOTE
        : null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} pilot
 */
export function focusedObjectRootFields(session, pilot) {
  const manifestoLine =
    typeof session?.manifesto_line === "string" ? session.manifesto_line : "";
  const scanUrl =
    typeof session?.scan_url === "string" && session.scan_url.startsWith("http")
      ? session.scan_url
      : null;
  const status = hubChildObjectStatusLine({
    publicState: manifestoLine.split("\n").slice(1).join("\n") || manifestoLine,
    scanUrl: scanUrl ?? "",
    status: typeof session?.status === "string" ? session.status : "active",
  });

  /** @type {Array<{ name: string; label: string; value: string; readonly?: boolean; multiline?: boolean }>} */
  const fields = [];

  if (pilot === "status_plate") {
    const lines = manifestoLine.split("\n");
    fields.push(
      { name: "public_label", label: "Object name", value: lines[0]?.trim() ?? "" },
      { name: "public_state", label: "Status line", value: lines[1]?.trim() ?? "" }
    );
  } else if (pilot === "lost_item_relay") {
    const raw = manifestoLine;
    const nl = raw.indexOf("\n");
    const first = nl >= 0 ? raw.slice(0, nl).trim() : raw.trim();
    const rest = nl >= 0 ? raw.slice(nl + 1).trim() : "";
    fields.push(
      {
        name: "public_label",
        label: "Item name",
        value: first.replace(/^\[relay\]\s*/, ""),
      },
      {
        name: "public_state",
        label: "Return message",
        value: rest,
        multiline: true,
      }
    );
  } else {
    fields.push({
      name: "manifesto_line",
      label: "Public line",
      value: manifestoLine.trim(),
      multiline: true,
    });
  }

  return {
    title: fields[0]?.value || "Scan point",
    typeBadge: pilot === "general" ? "Scan point" : collectionRowTypeBadge(pilot),
    roomBadge: null,
    statusLabel: status.label,
    statusTone: status.tone,
    recency: null,
    fields,
    publishMode: "root",
    objectType: pilot,
    scanUrl,
    canPublish: true,
    readOnlyNote: null,
  };
}

/**
 * @param {"child" | "root"} publishMode
 * @param {Record<string, string>} formValues
 * @param {{
 *   objectType?: string;
 *   pilot?: string;
 * }} meta
 */
export function focusedObjectPublishPayload(publishMode, formValues, meta = {}) {
  if (publishMode === "root") {
    const pilot = meta.pilot ?? "general";
    return {
      publishMode: "root",
      manifestoLine: buildRootManifestoLine(pilot, formValues),
    };
  }

  const objectType = meta.objectType ?? "";
  if (objectType === CHILD_OBJECT_TYPE_STATUS_PLATE) {
    const { publicLabel, publicState } = parseStatusPlateChildFields(
      formValues.public_label,
      formValues.public_state
    );
    return {
      publishMode: "child",
      objectType,
      publicLabel,
      publicState,
    };
  }
  if (objectType === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY) {
    const { publicLabel, publicState } = parseLostItemRelayChildFields(
      formValues.public_label,
      formValues.public_state
    );
    return {
      publishMode: "child",
      objectType,
      publicLabel,
      publicState,
    };
  }
  throw new Error("This scan point cannot be updated here yet.");
}

/**
 * @param {string} pilot
 * @param {Record<string, string>} formValues
 */
export function buildRootManifestoLine(pilot, formValues) {
  if (pilot === "status_plate") {
    const { publicLabel, publicState } = parseStatusPlateChildFields(
      formValues.public_label,
      formValues.public_state
    );
    return `${publicLabel}\n${publicState}`;
  }
  if (pilot === "lost_item_relay") {
    const { publicLabel, publicState } = parseLostItemRelayChildFields(
      formValues.public_label,
      formValues.public_state
    );
    return `${LOST_ITEM_RELAY_PREFIX}${publicLabel}\n${publicState}`;
  }
  const line = formValues.manifesto_line?.trim();
  if (!line) throw new Error("Public line is required.");
  return line;
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {Record<string, unknown> | null | undefined} session
 * @param {"child" | "root"} mode
 */
export function focusedObjectScanUrl(row, session, mode) {
  if (mode === "child" && row && typeof row.scan_url === "string" && row.scan_url) {
    return row.scan_url;
  }
  if (mode === "root" && session && typeof session.scan_url === "string" && session.scan_url) {
    return session.scan_url;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 */
export function isFocusedObjectStaleRow(row) {
  if (!row) return true;
  if (row.status === "disabled") return true;
  if (row.object_type === CHILD_OBJECT_TYPE_GAME_NODE) return !isActiveGameNodeRow(row);
  return false;
}
