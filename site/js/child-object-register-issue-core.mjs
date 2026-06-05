/** Copy for combined register + first scan link (step 15). */

import { CHILD_OBJECT_REGISTER_SUBMIT_LABEL } from "./created-display-labels-core.mjs";

export { CHILD_OBJECT_REGISTER_SUBMIT_LABEL };

/**
 * @param {"status_plate" | "lost_item_relay"} objectType
 */
export function childObjectRegisterProgressLabel(objectType) {
  if (objectType === "lost_item_relay") {
    return "Signing, registering tag, and creating QR…";
  }
  return "Signing, registering sign, and creating QR…";
}

/**
 * @param {{
 *   objectType: "status_plate" | "lost_item_relay";
 *   scanUrl?: string | null;
 *   issueFailed?: boolean;
 * }} ctx
 */
export function childObjectRegisterSuccessMessage(ctx) {
  if (ctx.issueFailed) {
    if (ctx.objectType === "lost_item_relay") {
      return "Lost-item tag registered on the network. Create QR below when ready.";
    }
    return "Sign registered on the network. Create QR below when ready.";
  }
  if (ctx.objectType === "lost_item_relay") {
    return "Lost-item tag registered and QR ready. Print or share the URL on the tag.";
  }
  return "Sign registered and QR ready. Print or share the URL on the sign.";
}
