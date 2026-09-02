import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  FOUNDING_PURSE_TEMPLATE_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";
import { resolvePrintifyLineItem } from "../src/print/printify-template-config";

const TIER0_ENV = {
  TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod",
  TIER0_PRINTIFY_VARIANT_ID: "11",
  TIER0_PRINTIFY_SHIPPING_METHOD: "2",
};

describe("resolvePrintifyLineItem", () => {
  it("returns null for unknown templates even when env is populated", () => {
    expect(resolvePrintifyLineItem(TIER0_ENV, "hc-unknown-template")).toBeNull();
    expect(resolvePrintifyLineItem(TIER0_ENV, "")).toBeNull();
  });

  it("rejects blank, whitespace, and missing product ids", () => {
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "", TIER0_PRINTIFY_VARIANT_ID: "11" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "   ", TIER0_PRINTIFY_VARIANT_ID: "11" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_VARIANT_ID: "11" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
  });

  it("rejects missing, zero, negative, and non-numeric variant ids", () => {
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod", TIER0_PRINTIFY_VARIANT_ID: "0" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod", TIER0_PRINTIFY_VARIANT_ID: "-3" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
    expect(
      resolvePrintifyLineItem(
        { TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod", TIER0_PRINTIFY_VARIANT_ID: "abc" },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toBeNull();
  });

  it("trims product ids and defaults invalid shipping methods to 1", () => {
    expect(
      resolvePrintifyLineItem(
        {
          TIER0_PRINTIFY_PRODUCT_ID: "  tier0_prod  ",
          TIER0_PRINTIFY_VARIANT_ID: "  11  ",
        },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      product_id: "tier0_prod",
      variant_id: 11,
      shipping_method: 1,
    });
    expect(
      resolvePrintifyLineItem(
        {
          TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod",
          TIER0_PRINTIFY_VARIANT_ID: "11",
          TIER0_PRINTIFY_SHIPPING_METHOD: "0",
        },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      product_id: "tier0_prod",
      variant_id: 11,
      shipping_method: 1,
    });
    expect(
      resolvePrintifyLineItem(
        {
          TIER0_PRINTIFY_PRODUCT_ID: "tier0_prod",
          TIER0_PRINTIFY_VARIANT_ID: "11",
          TIER0_PRINTIFY_SHIPPING_METHOD: "nope",
        },
        TIER0_BATCH_PRINT_TEMPLATE_ID
      )
    ).toEqual({
      product_id: "tier0_prod",
      variant_id: 11,
      shipping_method: 1,
    });
  });

  it("isolates env keys per template", () => {
    const mixed = {
      ...TIER0_ENV,
      PERSONALIZE_GLITCH_HOODIE_PRINTIFY_PRODUCT_ID: "glitch_prod",
      PERSONALIZE_GLITCH_HOODIE_PRINTIFY_VARIANT_ID: "22",
      PERSONALIZE_FOUNDING_PURSE_PRINTIFY_PRODUCT_ID: "purse_prod",
      PERSONALIZE_FOUNDING_PURSE_PRINTIFY_VARIANT_ID: "33",
      PERSONALIZE_FOUNDING_PURSE_PRINTIFY_SHIPPING_METHOD: "4",
    };
    expect(resolvePrintifyLineItem(mixed, GLITCH_HOODIE_TEMPLATE_ID)).toEqual({
      product_id: "glitch_prod",
      variant_id: 22,
      shipping_method: 1,
    });
    expect(resolvePrintifyLineItem(mixed, FOUNDING_PURSE_TEMPLATE_ID)).toEqual({
      product_id: "purse_prod",
      variant_id: 33,
      shipping_method: 4,
    });
    expect(resolvePrintifyLineItem(mixed, HOODIE_PRINT_TEMPLATE_ID)).toBeNull();
    expect(resolvePrintifyLineItem(mixed, DEFAULT_PRINT_TEMPLATE_ID)).toBeNull();
    expect(resolvePrintifyLineItem(mixed, TIER0_BATCH_PRINT_TEMPLATE_ID)?.product_id).toBe(
      "tier0_prod"
    );
  });
});
