/**
 * #update-status routing for /created/ Collection + Focused Object (PR 1 commit 4).
 */

import {
  CREATED_VIEW_COLLECTION,
  CREATED_VIEW_FOCUSED_OBJECT,
  resolveCreatedLandingView,
} from "./created-collection-route-core.mjs";
import { childObjectIdFromHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * @param {{
 *   objectIdParam?: string | null;
 *   hashChildObjectId?: string | null;
 *   sessionFocusObjectId?: string | null;
 *   childRows?: Record<string, unknown>[];
 * }} input
 */
export function resolveUpdateStatusCollectionLanding(input) {
  const rows = Array.isArray(input.childRows) ? input.childRows : [];
  const objectIdParam =
    typeof input.objectIdParam === "string" ? input.objectIdParam.trim() : "";
  if (objectIdParam) {
    return resolveCreatedLandingView({ objectIdParam, childRows: rows });
  }

  const hashChildId =
    typeof input.hashChildObjectId === "string" ? input.hashChildObjectId.trim() : "";
  const sessionFocus =
    typeof input.sessionFocusObjectId === "string"
      ? input.sessionFocusObjectId.trim()
      : "";
  const explicitFocus = hashChildId || sessionFocus;

  return resolveCreatedLandingView({
    explicitFocusObjectId: explicitFocus || null,
    childRows: rows,
  });
}

/**
 * @param {string} hashKey location.hash without #
 */
export function isUpdateStatusCollectionHash(hashKey = "") {
  const key = String(hashKey).replace(/^#/, "").trim();
  return key === "update-status" || !!childObjectIdFromHubFocusHash(key);
}

/**
 * @param {boolean} collectionFlagEnabled
 * @param {string} hashKey
 */
export function shouldDeferLegacyUpdateStatusPanelFocus(collectionFlagEnabled, hashKey = "") {
  if (!collectionFlagEnabled) return false;
  return isUpdateStatusCollectionHash(hashKey);
}

/**
 * @param {{
 *   pathname: string;
 *   searchParams: URLSearchParams;
 *   hash: string;
 *   landing: ReturnType<typeof resolveUpdateStatusCollectionLanding>;
 *   hashKey: string;
 * }} input
 * @returns {string | null}
 */
export function buildUpdateStatusCollectionUrl(input) {
  const params = new URLSearchParams(input.searchParams.toString());
  const hashKey = String(input.hashKey).replace(/^#/, "").trim();
  const keepUpdateStatusHash = hashKey === "update-status";
  let nextHash = input.hash;
  let changed = false;

  if (input.landing.view === CREATED_VIEW_FOCUSED_OBJECT && input.landing.objectId) {
    if (params.get("object_id") !== input.landing.objectId) {
      params.set("object_id", input.landing.objectId);
      changed = true;
    }
    const desiredHash = keepUpdateStatusHash ? "#update-status" : "";
    if (nextHash !== desiredHash) {
      nextHash = desiredHash;
      changed = true;
    }
  } else if (input.landing.view === CREATED_VIEW_COLLECTION) {
    const staleId =
      typeof input.landing.staleObjectId === "string"
        ? input.landing.staleObjectId.trim()
        : "";
    if (staleId) {
      if (params.get("object_id") !== staleId) {
        params.set("object_id", staleId);
        changed = true;
      }
    } else if (params.has("object_id")) {
      params.delete("object_id");
      changed = true;
    }
    const desiredHash = keepUpdateStatusHash ? "#update-status" : "";
    if (nextHash !== desiredHash) {
      nextHash = desiredHash;
      changed = true;
    }
  }

  if (!changed) return null;
  const search = params.toString();
  return `${input.pathname}${search ? `?${search}` : ""}${nextHash}`;
}
