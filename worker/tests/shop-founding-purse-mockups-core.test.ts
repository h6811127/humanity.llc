import { describe, expect, it } from "vitest";

import {
  listFoundingPurseMockups,
  resolveDefaultFoundingPurseMockup,
  findFoundingPurseMockupByView,
  foundingPurseMockupViewCaption,
  FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW,
} from "../../site/js/shop-founding-purse-mockups-core.mjs";

describe("shop-founding-purse-mockups-core", () => {
  it("lists mockups from payload with styled first", () => {
    const mockups = listFoundingPurseMockups({
      mockups: [
        { view_id: "context", label: "Flat lay", src: "/a.png" },
        { view_id: "styled", label: "Front styled", src: "/b.png", is_default: true },
        { view_id: "back", label: "Back", src: "/c.png" },
      ],
    });
    expect(mockups[0]?.view_id).toBe("styled");
    expect(mockups[1]?.view_id).toBe("back");
  });

  it("resolves default styled mockup", () => {
    const mockups = listFoundingPurseMockups({
      mockups: [{ view_id: "styled", label: "Front styled", src: "/b.png", is_default: true }],
    });
    expect(FOUNDING_PURSE_DEFAULT_MOCKUP_VIEW).toBe("styled");
    expect(resolveDefaultFoundingPurseMockup(mockups)?.view_id).toBe("styled");
    expect(findFoundingPurseMockupByView(mockups, "styled")?.src).toBe("/b.png");
  });

  it("returns view captions for styled and back angles", () => {
    expect(
      foundingPurseMockupViewCaption({ view_id: "styled", label: "Front styled", src: "/b.png" })
    ).toMatch(/front styled/i);
    expect(
      foundingPurseMockupViewCaption({ view_id: "back", label: "Back", src: "/c.png" })
    ).toMatch(/back/i);
  });
});
