import { describe, expect, it } from "vitest";

import {
  buildCustodyFromForm,
  custodyFormDefaults,
} from "../../site/js/child-object-custody-core.mjs";
import { mergeChildObjectDocumentFields } from "../../site/js/child-object-time-policy-core.mjs";

describe("child-object-custody-core", () => {
  it("builds custody from form data", () => {
    const custody = buildCustodyFromForm({
      custody_enabled: "1",
      custody_holder_label: "River gallery",
      custody_until: "2026-06-14T18:00",
      custody_note: "On loan for June show",
    });
    expect(custody?.holder_label).toBe("River gallery");
    expect(custody?.note).toBe("On loan for June show");
    expect(typeof custody?.until).toBe("string");
  });

  it("returns null when custody checkbox is off", () => {
    expect(buildCustodyFromForm({ custody_enabled: "" })).toBeNull();
  });

  it("requires holder label when custody is enabled", () => {
    expect(() =>
      buildCustodyFromForm({
        custody_enabled: "1",
        custody_holder_label: "   ",
      })
    ).toThrow(/Who holds this object is required/);
  });

  it("hydrates form defaults from stored row", () => {
    const defaults = custodyFormDefaults({
      custody: {
        holder_label: "@volunteer",
        until: "2026-06-14T22:00:00-05:00",
        note: "Front desk",
      },
    });
    expect(defaults.enabled).toBe(true);
    expect(defaults.holder_label).toBe("@volunteer");
    expect(defaults.note).toBe("Front desk");
  });

  it("mergeChildObjectDocumentFields updates custody while preserving time_policy", () => {
    const row = {
      object_id: "obj_1",
      object_type: "status_plate",
      public_label: "Door",
      public_state: "Open",
      time_policy: { valid_until: "2026-12-31T22:00:00-05:00", timezone: "UTC", schedule: [] },
    };
    const custody = { holder_label: "Desk", until: null, note: null };
    expect(mergeChildObjectDocumentFields(row, { custody })).toEqual({
      time_policy: row.time_policy,
      custody,
    });
  });

  it("mergeChildObjectDocumentFields clears custody when null", () => {
    const row = {
      object_id: "obj_1",
      object_type: "status_plate",
      public_label: "Door",
      public_state: "Open",
      custody: { holder_label: "Desk", until: null, note: null },
    };
    expect(mergeChildObjectDocumentFields(row, { custody: null })).toEqual({});
  });
});
