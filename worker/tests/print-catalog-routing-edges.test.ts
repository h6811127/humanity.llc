import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  FOUNDING_PURSE_STORE_PRODUCT_ID,
  FOUNDING_PURSE_TEMPLATE_ID,
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  STICKER_PERSONALIZED_STORE_PRODUCT_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
  getApprovedPrintCatalog,
  getPersonalizablePrintCatalog,
  getPrintCatalogProduct,
  isKnownStoreProductId,
  resolvePrintTemplateForStoreProductId,
} from "../src/print/print-catalog";

describe("isKnownStoreProductId", () => {
  it("accepts storefront ids and catalog product_id aliases after trim", () => {
    expect(isKnownStoreProductId(GLITCH_HOODIE_STORE_PRODUCT_ID)).toBe(true);
    expect(isKnownStoreProductId(`  ${STICKER_PERSONALIZED_STORE_PRODUCT_ID}  `)).toBe(
      true
    );
    expect(isKnownStoreProductId("prod_glitch_hoodie")).toBe(true);
    expect(isKnownStoreProductId("prod_sticker_square")).toBe(true);
    expect(isKnownStoreProductId("prod_tier0_sticker_batch")).toBe(true);
  });

  it("rejects blank, unknown, and lookalike ids", () => {
    expect(isKnownStoreProductId(null)).toBe(false);
    expect(isKnownStoreProductId("")).toBe(false);
    expect(isKnownStoreProductId("   ")).toBe(false);
    expect(isKnownStoreProductId("unknown_sku_v1")).toBe(false);
    expect(isKnownStoreProductId("glitch_hoodie_v1.evil")).toBe(false);
    expect(isKnownStoreProductId("prod_glitch_hoodie ")).toBe(true);
  });
});

describe("resolvePrintTemplateForStoreProductId", () => {
  it("maps storefront and catalog aliases, falling back to the default sticker", () => {
    expect(resolvePrintTemplateForStoreProductId(HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID)).toBe(
      HOODIE_LIVE_OBJECT_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId(FOUNDING_PURSE_STORE_PRODUCT_ID)).toBe(
      FOUNDING_PURSE_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId("  prod_glitch_hoodie  ")).toBe(
      GLITCH_HOODIE_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId("prod_founding_purse")).toBe(
      FOUNDING_PURSE_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId("prod_tier0_sticker_batch")).toBe(
      TIER0_BATCH_PRINT_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId(null)).toBe(DEFAULT_PRINT_TEMPLATE_ID);
    expect(resolvePrintTemplateForStoreProductId("   ")).toBe(DEFAULT_PRINT_TEMPLATE_ID);
    expect(resolvePrintTemplateForStoreProductId("unknown_sku_v1")).toBe(
      DEFAULT_PRINT_TEMPLATE_ID
    );
  });
});

describe("print catalog filters", () => {
  it("keeps Tier 0 batch out of the Tier 1 customizer list", () => {
    const personalizable = getPersonalizablePrintCatalog();
    expect(personalizable.some((row) => row.template_id === TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(
      false
    );
    expect(personalizable.every((row) => row.personalizable !== false)).toBe(true);
    expect(personalizable.map((row) => row.template_id).sort()).toEqual(
      [
        DEFAULT_PRINT_TEMPLATE_ID,
        FOUNDING_PURSE_TEMPLATE_ID,
        GLITCH_HOODIE_TEMPLATE_ID,
        HOODIE_LIVE_OBJECT_TEMPLATE_ID,
      ].sort()
    );
  });

  it("returns only enabled variants on the approved catalog", () => {
    const approved = getApprovedPrintCatalog();
    expect(approved.some((row) => row.template_id === TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(
      true
    );
    expect(approved.every((row) => row.variants.every((variant) => variant.enabled))).toBe(
      true
    );
    expect(getPrintCatalogProduct("missing-template")).toBeNull();
  });
});
