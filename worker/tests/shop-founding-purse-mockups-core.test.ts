import { describe, expect, it } from "vitest";

import {
  listFoundingPurseMockups,
  resolveDefaultFoundingPurseMockup,
  findFoundingPurseMockupByView,
  foundingPurseMockupViewCaption,
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

  it("returns view captions for composite vs static angles", () => {
    expect(
      foundingPurseMockupViewCaption({ view_id: "front", label: "Front", src: "/b.png", composites_qr: true })
    ).toMatch(/your planned LIVE OBJECT QR/i);
    expect(
      foundingPurseMockupViewCaption({ view_id: "styled", label: "Styled", src: "/c.png" })
    ).toMatch(/sample styling/i);
  });
});
