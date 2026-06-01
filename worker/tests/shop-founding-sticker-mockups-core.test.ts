import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FOUNDING_STICKER_MOCKUP_VIEW_ORDER,
  foundingStickerMockupViewCaption,
  listFoundingStickerMockups,
  resolveDefaultFoundingStickerMockup,
} from "../../site/js/shop-founding-sticker-mockups-core.mjs";

describe("shop-founding-sticker-mockups-core", () => {
  it("lists mockups in gallery order from manifest", () => {
    const raw = readFileSync(join(process.cwd(), "site/data/founding-sticker-mockups.json"), "utf8");
    const mockups = listFoundingStickerMockups(JSON.parse(raw));
    expect(mockups.map((m) => m.view_id)).toEqual(FOUNDING_STICKER_MOCKUP_VIEW_ORDER);
    expect(mockups[0]?.src).toMatch(/flat-kiss-cut\.png$/);
  });

  it("resolves flat kiss cut as default view", () => {
    const mockups = listFoundingStickerMockups({
      mockups: [
        { view_id: "on-gift", label: "On gift", src: "/a.jpg" },
        { view_id: "flat", label: "Kiss cut", src: "/b.png", is_default: true },
      ],
    });
    expect(resolveDefaultFoundingStickerMockup(mockups)?.view_id).toBe("flat");
  });

  it("captions mention batch QR honesty for flat view", () => {
    expect(
      foundingStickerMockupViewCaption({ view_id: "flat", label: "Kiss cut", src: "/x.png" })
    ).toMatch(/batch/i);
    expect(
      foundingStickerMockupViewCaption({ view_id: "on-laptop", label: "On laptop", src: "/y.jpg" })
    ).toMatch(/recognition/i);
  });

  it("manifest src paths exist on disk and match shop preview gallery", () => {
    const raw = readFileSync(join(process.cwd(), "site/data/founding-sticker-mockups.json"), "utf8");
    const mockups = listFoundingStickerMockups(JSON.parse(raw));
    const hubHtml = readFileSync(join(process.cwd(), "site/shop/index.html"), "utf8");
    const foundingHtml = readFileSync(join(process.cwd(), "site/shop/founding/index.html"), "utf8");

    for (const entry of mockups) {
      const rel = entry.src.replace(/^\//, "");
      const abs = join(process.cwd(), "site", rel);
      expect(readFileSync(abs).byteLength).toBeGreaterThan(0);
      expect(hubHtml).toContain(entry.src);
      expect(foundingHtml).toContain(entry.src);
      expect(hubHtml).toContain(entry.label);
    }

    expect(hubHtml).toContain('id="shop-sticker-gallery"');
    expect(foundingHtml).toContain("shop-sticker-gallery-grid--pdp");
    expect(foundingHtml).toContain(foundingStickerMockupViewCaption(mockups[0]!));
  });
});
