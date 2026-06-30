import { describe, expect, it } from "vitest";

import {
  CREATED_SHOP_LIVE_LABEL_DOORS,
  CREATED_SHOP_LIVE_LABEL_WEAR,
  CREATED_SHOP_MANAGE_SUB_DOORS,
  CREATED_SHOP_MANAGE_SUB_WEAR,
  CREATED_SHOP_MERCH_REF,
  createdShopAccessPresentation,
  createdShopCustomizePath,
} from "../../site/js/created-shop-access-core.mjs";

describe("created-shop-access-core", () => {
  it("builds customize URL with created_control attribution", () => {
    expect(createdShopCustomizePath()).toBe(
      "/shop/customize/?product=glitch_hoodie_v1&hc_ref=created_control"
    );
    expect(CREATED_SHOP_MERCH_REF).toBe("created_control");
  });

  it("hides shop entry in season room and non-control modes", () => {
    expect(
      createdShopAccessPresentation({ workspaceMode: "setup", activeRoom: "wear" })
    ).toEqual({ live: null, manage: null });
    expect(
      createdShopAccessPresentation({ workspaceMode: "control", activeRoom: "season" })
    ).toEqual({ live: null, manage: null });
  });

  it("promotes shop on wear room", () => {
    const wear = createdShopAccessPresentation({
      workspaceMode: "control",
      activeRoom: "wear",
    });
    expect(wear.live?.tone).toBe("secondary");
    expect(wear.live?.label).toBe(CREATED_SHOP_LIVE_LABEL_WEAR);
    expect(wear.manage?.sub).toBe(CREATED_SHOP_MANAGE_SUB_WEAR);
  });

  it("uses subtle live link on doors room", () => {
    const doors = createdShopAccessPresentation({
      workspaceMode: "control",
      activeRoom: "doors",
    });
    expect(doors.live?.tone).toBe("link");
    expect(doors.live?.label).toBe(CREATED_SHOP_LIVE_LABEL_DOORS);
    expect(doors.manage?.sub).toBe(CREATED_SHOP_MANAGE_SUB_DOORS);
  });
});
