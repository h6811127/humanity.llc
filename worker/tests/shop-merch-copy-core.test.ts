import { describe, expect, it } from "vitest";

import {
  customizeHeroForProduct,
  customizeHonestyRowsForProduct,
  pdpHonestyBlockFromRows,
  productHonestyBlockForId,
  SHOP_CUSTOMIZE_HONESTY_ROWS_GLITCH,
  SHOP_CUSTOMIZE_PROOF_PERSISTENCE,
  SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT,
  TIER1_HONESTY_SECTION_TITLE,
  tier1ThanksCopyForMerchRef,
} from "../../site/js/shop-merch-copy-core.mjs";

describe("shop-merch-copy-core", () => {
  it("exposes Glitch Tier 1 honesty block aligned with customizer rows", () => {
    const block = productHonestyBlockForId("glitch_hoodie_v1");
    expect(block).toEqual(pdpHonestyBlockFromRows(SHOP_CUSTOMIZE_HONESTY_ROWS_GLITCH));
    expect(block?.title).toBe(TIER1_HONESTY_SECTION_TITLE);
    expect(block?.lines[0]).toMatch(/hub → Update status/i);
  });

  it("exposes legacy Glitch honesty block as superseded", () => {
    const block = productHonestyBlockForId("tier0_glitch_hoodie_v1");
    expect(block?.title).toBe("Superseded for launch");
    expect(block?.lines).toHaveLength(3);
    expect(block?.lines[1]).toMatch(/deprecated/i);
    expect(block?.lines[1]).toMatch(/glitch_hoodie_v1/i);
  });

  it("exposes Live Object hoodie Tier 1 honesty register", () => {
    const block = productHonestyBlockForId("hoodie_live_object_v1");
    expect(block?.title).toBe(TIER1_HONESTY_SECTION_TITLE);
    expect(block?.lines.some((line) => line.startsWith("Fossil —"))).toBe(true);
    expect(block?.lines[0]).toMatch(/each unit/i);
  });

  it("customize persistence consent mentions recovery", () => {
    expect(SHOP_CUSTOMIZE_PROOF_PERSISTENCE).toMatch(/lose keys without recovery/i);
  });

  it("exposes Glitch print artifact callout for store and customizer", () => {
    expect(SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT.lead).toMatch(/blue or purple/i);
    expect(SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT.exampleSummary).toBe("See example");
    expect(SHOP_GLITCH_PRINT_ARTIFACT_CALLOUT.imageSrc).toMatch(
      /glitch-print-chromatic-artifact\.png\?v=3/
    );
  });

  it("exposes Glitch customizer hero without em dashes", () => {
    const hero = customizeHeroForProduct("glitch_hoodie_v1");
    expect(hero.title).toBe("Glitch LIVE QR hoodie");
    expect(hero.lead).not.toMatch(/—/);
    expect(hero.eyebrow).toMatch(/Founding drop/i);
    expect(hero.eyebrow).toMatch(/Founding drop/i);
    const rows = customizeHonestyRowsForProduct("glitch_hoodie_v1");
    expect(rows).toHaveLength(3);
    expect(rows[0]?.title).toBe("Live");
    expect(rows[0]?.sub).toMatch(/your unit/i);
  });

  it("uses Live Object honesty rows for generic hoodie customizer", () => {
    const rows = customizeHonestyRowsForProduct("hoodie_live_object_v1");
    expect(rows[0]?.sub).toMatch(/each unit/i);
  });

  it("exposes founding purse customizer hero and honesty rows", () => {
    const hero = customizeHeroForProduct("founding_purse_v1");
    expect(hero.title).toBe("Founding LIVE OBJECT purse");
    expect(hero.lead).toMatch(/2023 prototype/i);
    const rows = customizeHonestyRowsForProduct("founding_purse_v1");
    expect(rows[0]?.sub).toMatch(/purse QR/i);
  });

  it("exposes Glitch Tier 1 thanks copy for customize_glitch ref", () => {
    const copy = tier1ThanksCopyForMerchRef("customize_glitch");
    expect(copy.eyebrow).toMatch(/Founding drop/i);
    expect(copy.title).toMatch(/Glitch/i);
    expect(copy.meta).toMatch(/Glitch LIVE QR hoodie/i);
    expect(tier1ThanksCopyForMerchRef("customize_hoodie").title).toMatch(/Same ink/i);
  });
});
