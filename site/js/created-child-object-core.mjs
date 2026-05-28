import { inferPilotTemplate } from "./manifesto-display.mjs";

export const CHILD_OBJECT_TYPE_STATUS_PLATE = "status_plate";
export const CHILD_OBJECT_TYPE_LOST_ITEM_RELAY = "lost_item_relay";
export const CHILD_OBJECT_STATUS_DISABLED = "disabled";

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveStatusPlateRow(row) {
  return (
    row.object_type === CHILD_OBJECT_TYPE_STATUS_PLATE &&
    row.status !== CHILD_OBJECT_STATUS_DISABLED
  );
}

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveLostItemRelayRow(row) {
  return (
    row.object_type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY &&
    row.status !== CHILD_OBJECT_STATUS_DISABLED
  );
}

/**
 * Root general cards may add status plates as child objects (not flat-card pilots).
 * @param {Record<string, unknown> | null | undefined} session
 */
function isGeneralRootCardSession(session) {
  const explicit = typeof session?.pilot_template === "string" ? session.pilot_template : "";
  const pilot =
    explicit ||
    (typeof session?.manifesto_line === "string"
      ? inferPilotTemplate(session.manifesto_line)
      : "general");
  return pilot === "general";
}

/**
 * Root general cards may add status plates as child objects (not flat-card pilots).
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldOfferAddStatusPlate(session) {
  return isGeneralRootCardSession(session);
}

/**
 * Root general cards may add lost-item relays as child objects (not flat-card pilots).
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldOfferAddLostItemRelay(session) {
  return isGeneralRootCardSession(session);
}

/**
 * @param {unknown} publicLabelRaw
 * @param {unknown} publicStateRaw
 */
export function parseStatusPlateChildFields(publicLabelRaw, publicStateRaw) {
  const publicLabel = typeof publicLabelRaw === "string" ? publicLabelRaw.trim() : "";
  const publicState = typeof publicStateRaw === "string" ? publicStateRaw.trim() : "";
  if (!publicLabel || !publicState) {
    throw new Error("Object name and status line are required.");
  }
  if (publicLabel.length > 120) {
    throw new Error("Object name must be 120 characters or fewer.");
  }
  if (publicState.length > 280) {
    throw new Error("Status line must be 280 characters or fewer.");
  }
  return { publicLabel, publicState };
}

/**
 * @param {unknown} publicStateRaw
 */
export function parseStatusPlateChildState(publicStateRaw) {
  const publicState = typeof publicStateRaw === "string" ? publicStateRaw.trim() : "";
  if (!publicState) {
    throw new Error("Status line is required.");
  }
  if (publicState.length > 280) {
    throw new Error("Status line must be 280 characters or fewer.");
  }
  return { publicState };
}

/**
 * @param {unknown} publicLabelRaw
 * @param {unknown} publicStateRaw
 */
export function parseLostItemRelayChildFields(publicLabelRaw, publicStateRaw) {
  const publicLabel = typeof publicLabelRaw === "string" ? publicLabelRaw.trim() : "";
  const publicState = typeof publicStateRaw === "string" ? publicStateRaw.trim() : "";
  if (!publicLabel || !publicState) {
    throw new Error("Item name and return message are required.");
  }
  if (publicLabel.length > 120) {
    throw new Error("Item name must be 120 characters or fewer.");
  }
  if (publicState.length > 280) {
    throw new Error("Return message must be 280 characters or fewer.");
  }
  return { publicLabel, publicState };
}

/**
 * @param {unknown} publicStateRaw
 */
export function parseLostItemRelayChildState(publicStateRaw) {
  const publicState = typeof publicStateRaw === "string" ? publicStateRaw.trim() : "";
  if (!publicState) {
    throw new Error("Return message is required.");
  }
  if (publicState.length > 280) {
    throw new Error("Return message must be 280 characters or fewer.");
  }
  return { publicState };
}
