import { describe, expect, it } from "vitest";

import {
  ADD_LOST_ITEM_FOCUS,
  ADD_STATUS_PLATE_FOCUS,
  createConvergenceNudgeCopy,
  createdAddObjectFocus,
  createdAddObjectHref,
  isPilotObjectTemplate,
  listGeneralRootsWithKeys,
  normalizePilotObjectTemplate,
  pickPreferredGeneralRoot,
} from "../../site/js/create-flow-convergence-core.mjs";

describe("normalizePilotObjectTemplate", () => {
  it("maps lost_item URL param to relay template", () => {
    expect(normalizePilotObjectTemplate("lost_item")).toBe("lost_item_relay");
    expect(normalizePilotObjectTemplate("status_plate")).toBe("status_plate");
    expect(normalizePilotObjectTemplate("general")).toBeNull();
  });
});

describe("createdAddObjectFocus", () => {
  it("maps templates to Live panel hashes", () => {
    expect(createdAddObjectFocus("status_plate")).toBe(ADD_STATUS_PLATE_FOCUS);
    expect(createdAddObjectFocus("lost_item")).toBe(ADD_LOST_ITEM_FOCUS);
  });
});

describe("createdAddObjectHref", () => {
  it("builds /created/ deep link with profile, qr, and focus hash", () => {
    expect(
      createdAddObjectHref(
        {
          profile_id: "prof_abc",
          qr_id: "qr_test123",
          handle: "river_studio",
        },
        "status_plate",
        "https://humanity.llc"
      )
    ).toBe("/created/?profile_id=prof_abc&qr_id=qr_test123#add-status-plate");
  });
});

describe("listGeneralRootsWithKeys", () => {
  it("includes general roots with signing keys only", () => {
    const rows = listGeneralRootsWithKeys([
      { pilot_template: "general", profile_id: "p1", owner_private_key_b58: "k1" },
      { pilot_template: "status_plate", profile_id: "p2", owner_private_key_b58: "k2" },
      { pilot_template: "general", profile_id: "p3" },
    ]);
    expect(rows.map((r) => r.profile_id)).toEqual(["p1"]);
    expect(pickPreferredGeneralRoot(rows)?.profile_id).toBe("p1");
  });
});

describe("createConvergenceNudgeCopy", () => {
  it("recommends Live add when a general root exists", () => {
    const copy = createConvergenceNudgeCopy("status_plate", {
      preferredRoot: { handle: "river_studio", profile_id: "p1" },
      rootCount: 1,
    });
    expect(copy.title).toContain("existing card");
    expect(copy.primaryLabel).toBe("Add status plate on Live");
    expect(copy.collapseLegacyForm).toBe(true);
  });

  it("nudges general-first when no root exists", () => {
    const copy = createConvergenceNudgeCopy("lost_item_relay", {
      preferredRoot: null,
      rootCount: 0,
    });
    expect(copy.title).toContain("general Humanity Card");
    expect(copy.collapseLegacyForm).toBe(false);
  });
});

describe("isPilotObjectTemplate", () => {
  it("treats pilot templates only", () => {
    expect(isPilotObjectTemplate("status_plate")).toBe(true);
    expect(isPilotObjectTemplate("general")).toBe(false);
  });
});
