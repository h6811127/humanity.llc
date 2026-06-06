import { describe, expect, it } from "vitest";

import {
  CREATED_VIEW_COLLECTION,
  CREATED_VIEW_FOCUSED_OBJECT,
} from "../../site/js/created-collection-route-core.mjs";
import {
  buildUpdateStatusCollectionUrl,
  resolveUpdateStatusCollectionLanding,
  shouldDeferLegacyUpdateStatusPanelFocus,
} from "../../site/js/created-update-status-route-core.mjs";

const PLATE_A = {
  object_id: "obj_plate_a",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
};

const PLATE_B = {
  object_id: "obj_plate_b",
  object_type: "status_plate",
  public_label: "Side door",
  public_state: "Closed",
  status: "active",
};

describe("created-update-status-route-core", () => {
  it("resolveUpdateStatusCollectionLanding opens focused object for valid object_id", () => {
    expect(
      resolveUpdateStatusCollectionLanding({
        objectIdParam: "obj_plate_b",
        childRows: [PLATE_A, PLATE_B],
      })
    ).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_b",
      staleObjectId: null,
    });
  });

  it("resolveUpdateStatusCollectionLanding opens sole child without object_id", () => {
    expect(
      resolveUpdateStatusCollectionLanding({
        childRows: [PLATE_A],
      })
    ).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_a",
      staleObjectId: null,
    });
  });

  it("2+ children without focus remains collection", () => {
    expect(
      resolveUpdateStatusCollectionLanding({
        childRows: [PLATE_A, PLATE_B],
      })
    ).toEqual({
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: null,
    });
  });

  it("session focus opens focused object for one of many children", () => {
    expect(
      resolveUpdateStatusCollectionLanding({
        sessionFocusObjectId: "obj_plate_b",
        childRows: [PLATE_A, PLATE_B],
      })
    ).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_b",
      staleObjectId: null,
    });
  });

  it("buildUpdateStatusCollectionUrl adds object_id for focused landing", () => {
    expect(
      buildUpdateStatusCollectionUrl({
        pathname: "/created/",
        searchParams: new URLSearchParams("profile_id=prof_1&qr_id=qr_test"),
        hash: "#update-status",
        hashKey: "update-status",
        landing: {
          view: CREATED_VIEW_FOCUSED_OBJECT,
          objectId: "obj_plate_a",
          staleObjectId: null,
        },
      })
    ).toBe("/created/?profile_id=prof_1&qr_id=qr_test&object_id=obj_plate_a#update-status");
  });

  it("shouldDeferLegacyUpdateStatusPanelFocus only when flag is on", () => {
    expect(shouldDeferLegacyUpdateStatusPanelFocus(false, "update-status")).toBe(false);
    expect(shouldDeferLegacyUpdateStatusPanelFocus(true, "update-status")).toBe(true);
    expect(shouldDeferLegacyUpdateStatusPanelFocus(true, "revoke")).toBe(false);
  });
});
