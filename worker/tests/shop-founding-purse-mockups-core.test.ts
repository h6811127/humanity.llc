import { describe, expect, it } from "vitest";

import {
  listFoundingPurseMockups,
  resolveDefaultFoundingPurseMockup,
  findFoundingPurseMockupByView,
} from "../../site/js/shop-founding-purse-mockups-core.mjs";

describe("shop-founding-purse-mockups-core", () => {
  it("lists mockups from payload with front first", () => {
    const mockups = listFoundingPurseMockups({
      mockups: [
        { view_id: "context", label: "Flat lay", src: "/a.png" },
        { view_id: "front", label: "Front", src: "/b.png", composites_qr: true },
      ],
    });
    expect(mockups[0]?.view_id).toBe("front");
    expect(mockups[0]?.composites_qr).toBe(true);
  });

  it("resolves default front mockup", () => {
    const mockups = listFoundingPurseMockups({
      mockups: [{ view_id: "front", label: "Front", src: "/b.png", is_default: true }],
    });
    expect(resolveDefaultFoundingPurseMockup(mockups)?.view_id).toBe("front");
    expect(findFoundingPurseMockupByView(mockups, "front")?.src).toBe("/b.png");
  });
});
