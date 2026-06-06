/**
 * Shared /created/ landing resolution for Collection + Focused Object.
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import { isCollapsedPassRoot } from "./created-collapsed-pass-core.mjs";
import { resolveCreatedLandingView } from "./created-collection-route-core.mjs";
import { childObjectIdFromHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   session?: Record<string, unknown> | null;
 *   searchParams?: Pick<URLSearchParams, "get">;
 *   hash?: string;
 *   storage?: Pick<Storage, "getItem">;
 * }} input
 */
export function resolveCreatedPagePresentation(input) {
  const storage = input.storage ?? null;
  const profileId = input.profileId;
  const childRows = storage ? readChildObjectRows(storage, profileId) : [];
  const collapsedPass = isCollapsedPassRoot({
    searchParams: input.searchParams ?? null,
    session: input.session,
    childRows,
  });
  const hashKey = String(input.hash ?? "").replace(/^#/, "");
  const explicitFocus = childObjectIdFromHubFocusHash(hashKey);
  const landing = resolveCreatedLandingView({
    profileId,
    objectIdParam: input.searchParams?.get("object_id") ?? null,
    explicitFocusObjectId: explicitFocus,
    childRows,
    collapsedPass,
  });
  return { landing, childRows, collapsedPass };
}

/**
 * @param {string} profileId
 * @param {Pick<URLSearchParams, "get">} [searchParams]
 */
export function createdCollectionHomeUrl(profileId, searchParams) {
  const params = new URLSearchParams();
  params.set("profile_id", profileId);
  if (searchParams) {
    const qrId = searchParams.get("qr_id")?.trim();
    if (qrId) params.set("qr_id", qrId);
  }
  return `/created/?${params.toString()}`;
}
