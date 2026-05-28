import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { childObjectIssueQrPath } from "../../site/js/child-object-api-core.mjs";

import {
  appendChildObjectRow,
  childObjectsBucketKey,
  readChildObjectRows,
  updateChildObjectRow,
} from "../../site/js/child-object-store-core.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  isActiveStatusPlateRow,
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

  it("stores issued scan link metadata on the row", () => {
    const storage = new Map();
    const ls = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", {
      qr_id: "qr_testPlateScan01",
      scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_testPlateScan01`,
    });
    expect(readChildObjectRows(ls, PROFILE)[0]).toMatchObject({
      qr_id: "qr_testPlateScan01",
      scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_testPlateScan01`,
    });
  });

  it("stores disabled status on child object rows", () => {
    const storage = new Map();
    const ls = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", { status: "disabled" });
    expect(readChildObjectRows(ls, PROFILE)[0].status).toBe("disabled");
  });
});

describe("child-object issue-qr client", () => {
  it("exports issue-qr path and signing module for /created/", () => {
    expect(childObjectIssueQrPath("prof_1", "obj_1")).toContain("/issue-qr");
    const src = readFileSync(
      join(process.cwd(), "site/js/created-child-object.mjs"),
      "utf8"
    );
    expect(src).toContain("child-object-plate-issue-qr");
    expect(src).toContain("child-object-plate-disable");
    expect(src).toContain("signChildObjectIssueQr");
    expect(src).toContain("signChildObjectRevoke");
    expect(src).toContain("postChildObjectIssueQr");
    expect(src).toContain("postChildObjectRevoke");
  });
});

describe("created-child-object-core", () => {
  it("hides disabled status plates from active list", () => {
    expect(
      isActiveStatusPlateRow({
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        public_label: "Door",
        public_state: "Open",
      })
    ).toBe(true);
    expect(
      isActiveStatusPlateRow({
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        public_label: "Door",
        public_state: "Closed",
        status: CHILD_OBJECT_STATUS_DISABLED,
      })
    ).toBe(false);
  });

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
