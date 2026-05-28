import { describe, expect, it } from "vitest";

import {
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  parseStatusPlateChildFields,
  shouldOfferAddStatusPlate,
} from "../../site/js/created-child-object-core.mjs";

describe("shouldOfferAddStatusPlate", () => {
  it("allows general root cards", () => {
    expect(shouldOfferAddStatusPlate({ pilot_template: "general" })).toBe(true);
    expect(shouldOfferAddStatusPlate({ manifesto_line: "Open studio" })).toBe(true);
  });

  it("hides for non-general pilots", () => {
    expect(shouldOfferAddStatusPlate({ pilot_template: "status_plate" })).toBe(false);
    expect(shouldOfferAddStatusPlate({ pilot_template: "lost_item" })).toBe(false);
  });
});

describe("parseStatusPlateChildFields", () => {
  it("trims label and state", () => {
    expect(
      parseStatusPlateChildFields("  Front door  ", "  Away until Friday  ")
    ).toEqual({
      publicLabel: "Front door",
      publicState: "Away until Friday",
    });
  });

  it("requires both fields", () => {
    expect(() => parseStatusPlateChildFields("", "ok")).toThrow(/required/);
  });

  it("exports status plate type constant", () => {
    expect(CHILD_OBJECT_TYPE_STATUS_PLATE).toBe("status_plate");
  });
});
