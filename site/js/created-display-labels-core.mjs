/** Steward-facing display labels for /created/ (presentation only). */

export const CHILD_OBJECT_REGISTER_SUBMIT_LABEL = "Create QR";

export const CREATED_CONNECTION_DETAILS_SUMMARY = "Connection details";

export const CREATED_SETUP_FINISH_LABEL = "Continue";

export const CREATED_ADD_HUB_SUMMARY = "Add another QR";

export const CREATED_ADD_SIGN_TITLE = "Add another sign";
export const CREATED_ADD_FIRST_SIGN_TITLE = "Add sign";
export const CREATED_ADD_FIRST_SIGN_BODY =
  "Create a QR saved under this @name.";

export const CREATED_ADD_LOST_ITEM_TAG_TITLE = "Add another lost-item tag";
export const CREATED_ADD_FIRST_LOST_ITEM_TAG_TITLE = "Add lost-item tag";
export const CREATED_ADD_FIRST_LOST_ITEM_TAG_BODY =
  "Create a return QR saved under this @name.";

export const CREATED_ADD_CHECKPOINT_TITLE = "Add another checkpoint";

/**
 * @param {string | null | undefined} handle
 * @returns {string | null}
 */
export function formatCreatedHandleLabel(handle) {
  if (!handle || typeof handle !== "string") return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * @param {string | null | undefined} handle
 * @param {"sign" | "lost_item"} kind
 * @param {boolean} isFirst
 */
export function createdAddChildObjectBody(handle, kind, isFirst) {
  const label = formatCreatedHandleLabel(handle);
  const scope = label ? ` saved under this ${label}` : "";
  if (kind === "lost_item") {
    return isFirst
      ? `Create a return QR${scope}.`
      : `Create another return QR${scope}.`;
  }
  return isFirst
    ? `Create a QR${scope}.`
    : `Create another QR${scope}.`;
}
