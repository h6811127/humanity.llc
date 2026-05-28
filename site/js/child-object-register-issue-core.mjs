/** Copy for combined register + first scan link (step 15). */

export const CHILD_OBJECT_REGISTER_SUBMIT_LABEL = "Register & issue scan link";

/**
 * @param {"status_plate" | "lost_item_relay"} objectType
 */
export function childObjectRegisterProgressLabel(objectType) {
  if (objectType === "lost_item_relay") {
    return "Signing, registering relay, and issuing scan link…";
  }
  return "Signing, registering plate, and issuing scan link…";
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
      return "Lost-item relay registered on the network. Issue scan link below when ready.";
    }
    return "Status plate registered on the network. Issue scan link below when ready.";
  }
  if (ctx.objectType === "lost_item_relay") {
    return "Lost-item relay registered and scan link ready — print or share the URL on the tag.";
  }
  return "Status plate registered and scan link ready — print or share the URL on the plate.";
}
