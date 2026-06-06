/**
 * Apply #update-status Collection routing on /created/ load.
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import { isCreatedCollectionFlagEnabled } from "./created-collection-flag-core.mjs";
import {
  readCreatedFocusObjectId,
} from "./created-collection-route-core.mjs";
import {
  buildUpdateStatusCollectionUrl,
  isUpdateStatusCollectionHash,
  resolveUpdateStatusCollectionLanding,
} from "./created-update-status-route-core.mjs";
import { childObjectIdFromHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * @param {Window} win
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem">} storage
 * @param {Pick<Storage, "getItem">} sessionStorage
 */
export function syncUpdateStatusCollectionRouteFromWindow(
  win,
  profileId,
  storage,
  sessionStorage
) {
  if (!profileId || !win?.location) return false;
  const params = new URLSearchParams(win.location.search);
  if (!isCreatedCollectionFlagEnabled(params, storage)) return false;

  const hashKey = win.location.hash.replace(/^#/, "");
  if (!isUpdateStatusCollectionHash(hashKey)) return false;

  const landing = resolveUpdateStatusCollectionLanding({
    objectIdParam: params.get("object_id"),
    hashChildObjectId: childObjectIdFromHubFocusHash(hashKey),
    sessionFocusObjectId: readCreatedFocusObjectId(sessionStorage, profileId),
    childRows: readChildObjectRows(storage, profileId),
  });

  const nextHref = buildUpdateStatusCollectionUrl({
    pathname: win.location.pathname,
    searchParams: params,
    hash: win.location.hash,
    landing,
    hashKey,
  });
  if (!nextHref) return false;
  win.history.replaceState(null, "", nextHref);
  return true;
}
