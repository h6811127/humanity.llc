import { describe, expect, it } from "vitest";

import {
  productHonestyBlockForId,
  SHOP_CUSTOMIZE_PROOF_PERSISTENCE,
} from "../../site/js/shop-merch-copy-core.mjs";

describe("shop-merch-copy-core", () => {
  it("exposes Glitch honesty block", () => {
    const block = productHonestyBlockForId("tier0_glitch_hoodie_v1");
    expect(block?.title).toBe("How the scan behaves");
    expect(block?.lines).toHaveLength(3);
    expect(block?.lines[0]).toMatch(/^Live —/);
    expect(block?.lines[1]).toMatch(/Not yours/);
  });

  it("exposes Live Object hoodie fossil line", () => {
    const block = productHonestyBlockForId("hoodie_live_object_v1");
    expect(block?.lines.some((line) => line.startsWith("Fossil —"))).toBe(true);
  });

  it("customize persistence consent mentions recovery", () => {
    expect(SHOP_CUSTOMIZE_PROOF_PERSISTENCE).toMatch(/lose keys without recovery/i);
  });
});
