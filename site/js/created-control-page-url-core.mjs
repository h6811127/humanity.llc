/**
 * Shared /created/ control-page URL helpers (PR 1 commit 4).
 */

import { childObjectHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * @param {URL} url
 * @param {{
 *   focus?: string | null;
 *   objectId?: string | null;
 *   collectionFlagEnabled?: boolean;
 * }} input
 */
export function applyCreatedControlPageTarget(url, input) {
  const flag = input.collectionFlagEnabled === true;
  const objectId = typeof input.objectId === "string" ? input.objectId.trim() : "";
  const focus = typeof input.focus === "string" ? input.focus.trim() : "";

  if (flag && objectId) {
    url.searchParams.set("object_id", objectId);
  } else if (flag) {
    url.searchParams.delete("object_id");
  }

  if (flag) {
    if (focus && focus !== "now") {
      url.hash = focus;
    } else {
      url.hash = "";
    }
    return;
  }

  if (objectId) {
    url.hash = childObjectHubFocusHash(objectId);
  } else if (focus && focus !== "now") {
    url.hash = focus;
  } else {
    url.hash = "";
  }
}

/**
 * @param {{
 *   profileId: string;
 *   qrId?: string | null;
 *   objectId?: string | null;
 *   focus?: string | null;
 *   collectionFlagEnabled?: boolean;
 *   returnUrl?: string | null;
 *   intent?: string | null;
 * }} input
 */
export function buildCreatedControlPagePath(input) {
  const params = new URLSearchParams();
  params.set("profile_id", String(input.profileId));
  const qrId = typeof input.qrId === "string" ? input.qrId.trim() : "";
  if (qrId) params.set("qr_id", qrId);

  const flag = input.collectionFlagEnabled === true;
  const objectId = typeof input.objectId === "string" ? input.objectId.trim() : "";
  if (flag && objectId) params.set("object_id", objectId);

  const returnUrl = typeof input.returnUrl === "string" ? input.returnUrl.trim() : "";
  if (returnUrl) {
    params.set("return_url", returnUrl);
    params.set("intent", input.intent?.trim() || "vouch");
  }

  const url = new URL(`https://humanity.invalid/created/?${params.toString()}`);
  applyCreatedControlPageTarget(url, {
    focus: input.focus,
    objectId,
    collectionFlagEnabled: flag,
  });
  return `${url.pathname}${url.search}${url.hash}`;
}
