import { describe, expect, it } from "vitest";

import {
  createdCollectionHomeUrl,
  resolveCreatedPagePresentation,
} from "../../site/js/created-collection-landing-core.mjs";
import {
  CREATED_VIEW_COLLECTION,
  CREATED_VIEW_FOCUSED_OBJECT,
} from "../../site/js/created-collection-route-core.mjs";
import { childObjectsBucketKey } from "../../site/js/child-object-store-core.mjs";
import { childObjectHubFocusHash } from "../../site/js/hub-child-object-row-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";

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

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("created-collection-landing-core", () => {
  it("reads child rows and focuses via hub hash", () => {
    const storage = memoryStorage({
      [childObjectsBucketKey(PROFILE)]: JSON.stringify([PLATE_A, PLATE_B]),
    });
    const presentation = resolveCreatedPagePresentation({
      profileId: PROFILE,
      storage,
      hash: `#${childObjectHubFocusHash("obj_plate_b")}`,
      searchParams: new URLSearchParams(""),
    });
    expect(presentation.childRows).toHaveLength(2);
    expect(presentation.landing).toEqual({
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: "obj_plate_b",
      staleObjectId: null,
    });
  });

  it("prefers object_id query over hub hash and reports stale ids", () => {
    const storage = memoryStorage({
      [childObjectsBucketKey(PROFILE)]: JSON.stringify([PLATE_A, PLATE_B]),
    });
    const focused = resolveCreatedPagePresentation({
      profileId: PROFILE,
      storage,
      hash: `#${childObjectHubFocusHash("obj_plate_a")}`,
      searchParams: new URLSearchParams("object_id=obj_plate_b"),
    });
    expect(focused.landing.objectId).toBe("obj_plate_b");

    const stale = resolveCreatedPagePresentation({
      profileId: PROFILE,
      storage,
      searchParams: new URLSearchParams("object_id=obj_missing"),
    });
    expect(stale.landing).toEqual({
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: "obj_missing",
    });
  });

  it("lands on collection when storage is absent or empty", () => {
    expect(
      resolveCreatedPagePresentation({
        profileId: PROFILE,
        searchParams: new URLSearchParams(""),
      }).landing.view
    ).toBe(CREATED_VIEW_COLLECTION);

    const storage = memoryStorage({
      [childObjectsBucketKey(PROFILE)]: "not-json",
    });
    expect(
      resolveCreatedPagePresentation({
        profileId: PROFILE,
        storage,
      }).childRows
    ).toEqual([]);
  });

  it("preserves qr_id on collection home URLs", () => {
    expect(createdCollectionHomeUrl(PROFILE)).toBe(`/created/?profile_id=${PROFILE}`);
    expect(
      createdCollectionHomeUrl(PROFILE, new URLSearchParams("qr_id=qr_abc&x=1"))
    ).toBe(`/created/?profile_id=${PROFILE}&qr_id=qr_abc`);
  });
});
