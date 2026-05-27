import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  getPersonalizablePrintCatalog,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  resolvePrintTemplateForStoreProductId,
  STICKER_PERSONALIZED_STORE_PRODUCT_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";

describe("print-catalog", () => {
  it("excludes Tier 0 batch from personalizable catalog", () => {
    const personalizable = getPersonalizablePrintCatalog();
    expect(personalizable.some((p) => p.template_id === TIER0_BATCH_PRINT_TEMPLATE_ID)).toBe(
      false
    );
    expect(personalizable.some((p) => p.template_id === HOODIE_LIVE_OBJECT_TEMPLATE_ID)).toBe(
      true
    );
  });

  it("maps storefront product ids to print templates", () => {
    expect(resolvePrintTemplateForStoreProductId(STICKER_PERSONALIZED_STORE_PRODUCT_ID)).toBe(
      DEFAULT_PRINT_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId("hoodie_live_object_v1")).toBe(
      HOODIE_LIVE_OBJECT_TEMPLATE_ID
    );
    expect(resolvePrintTemplateForStoreProductId(null)).toBe(DEFAULT_PRINT_TEMPLATE_ID);
  });
});
