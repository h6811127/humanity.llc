/**
 * Control this item — room-aware shop entry (What opens + Settings).
 * @see docs/MERCH_FUNNEL_MVP.md § Create vs buy · STEWARD_UX_PRESENTATION_TARGET.md § Room 2
 */
import { appendMerchRefToHref } from "./merch-funnel-core.mjs";
import { GLITCH_HOODIE_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  STEWARD_ROOM_WEAR,
} from "./steward-active-room-core.mjs";

/** Aggregate funnel attribution for shop links from /created/ control mode. */
export const CREATED_SHOP_MERCH_REF = "created_control";

export const CREATED_SHOP_BROWSE_PATH = "/shop/";

export const CREATED_SHOP_MANAGE_TITLE = "Order on wear";

export const CREATED_SHOP_MANAGE_SUB_WEAR =
  "Hoodie or sticker with your live QR printed";

export const CREATED_SHOP_MANAGE_SUB_DOORS =
  "Print your own above — or order a hoodie or sticker";

export const CREATED_SHOP_MANAGE_HINT =
  "Buying never grants vouch status. Your keys stay on this device until checkout.";

export const CREATED_SHOP_LIVE_LABEL_WEAR = "Get it on wear";

export const CREATED_SHOP_LIVE_LABEL_DOORS = "Or order a printed carrier";

export const CREATED_SHOP_MANAGE_CTA = "Customize on wear";

export const CREATED_SHOP_BROWSE_CTA = "See all carriers";

/**
 * @returns {string} Same-origin customize path with funnel attribution.
 */
export function createdShopCustomizePath() {
  const path = `/shop/customize/?product=${encodeURIComponent(GLITCH_HOODIE_STORE_PRODUCT_ID)}`;
  return appendMerchRefToHref(path, CREATED_SHOP_MERCH_REF);
}

/**
 * @param {{
 *   activeRoom?: string | null;
 *   workspaceMode?: string;
 * }} input
 */
export function createdShopAccessPresentation(input) {
  const workspaceMode = input.workspaceMode ?? "view";
  if (workspaceMode !== "control") {
    return { live: null, manage: null };
  }

  const room = input.activeRoom ?? STEWARD_ROOM_DOORS;
  if (room === STEWARD_ROOM_SEASON) {
    return { live: null, manage: null };
  }

  const customizeHref = createdShopCustomizePath();
  const browseHref = CREATED_SHOP_BROWSE_PATH;

  if (room === STEWARD_ROOM_WEAR) {
    return {
      live: {
        visible: true,
        tone: "secondary",
        label: CREATED_SHOP_LIVE_LABEL_WEAR,
        href: customizeHref,
      },
      manage: {
        visible: true,
        title: CREATED_SHOP_MANAGE_TITLE,
        sub: CREATED_SHOP_MANAGE_SUB_WEAR,
        hint: CREATED_SHOP_MANAGE_HINT,
        href: customizeHref,
        browseHref,
      },
    };
  }

  if (room === STEWARD_ROOM_DOORS) {
    return {
      live: {
        visible: true,
        tone: "link",
        label: CREATED_SHOP_LIVE_LABEL_DOORS,
        href: customizeHref,
      },
      manage: {
        visible: true,
        title: CREATED_SHOP_MANAGE_TITLE,
        sub: CREATED_SHOP_MANAGE_SUB_DOORS,
        hint: CREATED_SHOP_MANAGE_HINT,
        href: customizeHref,
        browseHref,
      },
    };
  }

  return { live: null, manage: null };
}
