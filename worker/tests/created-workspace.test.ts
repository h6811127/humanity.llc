import { describe, expect, it } from "vitest";

import { createdHeroTitleForMode } from "../../site/js/created-workspace.mjs";

describe("createdHeroTitleForMode", () => {
  it("uses setup, view, and steward titles", () => {
    expect(createdHeroTitleForMode("setup")).toBe("Set up your live QR");
    expect(createdHeroTitleForMode("view")).toBe("View this card");
    expect(createdHeroTitleForMode("control")).toBe("Control this item");
  });
});
