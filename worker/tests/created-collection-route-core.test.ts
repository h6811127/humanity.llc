import { describe, expect, it } from "vitest";

import {
  CREATED_VIEW_COLLECTION,
  CREATED_VIEW_FOCUSED_OBJECT,
  resolveCreatedLandingView,
} from "../../site/js/created-collection-route-core.mjs";

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

describe("created-collection-route-core", () => {
  it("0 active children lands on collection", () => {
    expect(resolveCreatedLandingView({ childRows: [] })).toEqual({
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: null,
    });
  });

  it("1 active child lands on focused object", () => {
    expect(resolveCreatedLandingView({ childRows: [PLATE_A] })).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_a",
      staleObjectId: null,
    });
  });

  it("2+ active children land on collection", () => {
    expect(resolveCreatedLandingView({ childRows: [PLATE_A, PLATE_B] })).toEqual({
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: null,
    });
  });

  it("valid object_id opens focused object", () => {
    expect(
      resolveCreatedLandingView({
        objectIdParam: "obj_plate_b",
        childRows: [PLATE_A, PLATE_B],
      })
    ).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_b",
      staleObjectId: null,
    });
  });

  it("invalid object_id lands on collection with stale state", () => {
    expect(
      resolveCreatedLandingView({
        objectIdParam: "obj_missing",
        childRows: [PLATE_A, PLATE_B],
      })
    ).toEqual({
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: "obj_missing",
    });
  });
});
