import { inferPilotTemplate } from "./manifesto-display.mjs";

export const CHILD_OBJECT_TYPE_STATUS_PLATE = "status_plate";
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
 * Root general cards may add status plates as child objects (not flat-card pilots).
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldOfferAddStatusPlate(session) {
  const explicit = typeof session?.pilot_template === "string" ? session.pilot_template : "";
  const pilot =
    explicit ||
    (typeof session?.manifesto_line === "string"
      ? inferPilotTemplate(session.manifesto_line)
      : "general");
  return pilot === "general";
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
