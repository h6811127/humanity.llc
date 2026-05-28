import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_PRODUCT_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  STICKER_PERSONALIZED_PRODUCT_ID,
  getPrintCatalogProduct,
  resolvePrintTemplateIdForProduct,
} from "../src/print/print-catalog";

describe("resolvePrintTemplateIdForProduct", () => {
  it("maps hoodie product to hoodie template", () => {
    expect(resolvePrintTemplateIdForProduct(HOODIE_LIVE_OBJECT_PRODUCT_ID)).toBe(
      HOODIE_PRINT_TEMPLATE_ID
    );
  });

  it("maps sticker product and unknown to default sticker template", () => {
    expect(resolvePrintTemplateIdForProduct(STICKER_PERSONALIZED_PRODUCT_ID)).toBe(
      DEFAULT_PRINT_TEMPLATE_ID
    );
    expect(resolvePrintTemplateIdForProduct(null)).toBe(DEFAULT_PRINT_TEMPLATE_ID);
    expect(resolvePrintTemplateIdForProduct("unknown_product")).toBe(DEFAULT_PRINT_TEMPLATE_ID);
  });
});

describe("getPrintCatalogProduct", () => {
  it("includes Tier 1 hoodie and sticker templates", () => {
    expect(getPrintCatalogProduct(HOODIE_PRINT_TEMPLATE_ID)?.type).toBe("hoodie");
    expect(getPrintCatalogProduct(DEFAULT_PRINT_TEMPLATE_ID)?.product_id).toBe(
      "prod_sticker_square"
    );
  });
});
