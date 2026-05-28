import { describe, expect, it } from "vitest";

import {
  appendChildObjectRow,
  childObjectsBucketKey,
  readChildObjectRows,
  updateChildObjectRow,
} from "../../site/js/child-object-store-core.mjs";
import {
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  parseStatusPlateChildFields,
  parseStatusPlateChildState,
  shouldOfferAddStatusPlate,
} from "../../site/js/created-child-object-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";

describe("child-object-store-core", () => {
  it("stores rows per profile in localStorage", () => {
    const storage = new Map();
    const ls = {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    };
    expect(childObjectsBucketKey(PROFILE)).toContain(PROFILE);
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    const rows = readChildObjectRows(ls, PROFILE);
    expect(rows).toHaveLength(1);
    expect(rows[0].public_state).toBe("Open");
  });

  it("updates stored child object rows", () => {
    const storage = new Map();
    const ls = {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", { public_state: "Closed" });
    expect(readChildObjectRows(ls, PROFILE)[0].public_state).toBe("Closed");
  });
});

describe("created-child-object-core", () => {
  it("offers add status plate only for general root cards", () => {
    expect(shouldOfferAddStatusPlate({ pilot_template: "general" })).toBe(true);
    expect(shouldOfferAddStatusPlate({ pilot_template: "status_plate" })).toBe(false);
    expect(
      shouldOfferAddStatusPlate({ manifesto_line: "Studio door\nOpen until 9 PM" })
    ).toBe(false);
  });

  it("validates status plate child fields", () => {
    expect(
      parseStatusPlateChildFields("Studio door", "Open until 9 PM")
    ).toEqual({
      publicLabel: "Studio door",
      publicState: "Open until 9 PM",
    });
    expect(() => parseStatusPlateChildFields("", "Open")).toThrow(/required/i);
    expect(() => parseStatusPlateChildFields("x".repeat(121), "Open")).toThrow(/120/);
    expect(() => parseStatusPlateChildFields("Door", "x".repeat(281))).toThrow(/280/);
  });

  it("validates status plate child state updates", () => {
    expect(parseStatusPlateChildState("Open until 9 PM")).toEqual({
      publicState: "Open until 9 PM",
    });
    expect(() => parseStatusPlateChildState("")).toThrow(/required/i);
    expect(() => parseStatusPlateChildState("x".repeat(281))).toThrow(/280/);
  });
});
