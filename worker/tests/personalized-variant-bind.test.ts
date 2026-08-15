import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ARTIFACT_INTENT_VARIANT_MISMATCH,
  PERSONALIZED_SHOPIFY_VARIANT_BINDINGS,
  collectPaidShopifyVariantIdsForIntent,
  personalizedShopifyVariantsFromShopConfig,
  validateIntentPaidShopifyVariants,
} from "../src/commerce/personalized-variant-bind";

const NAVY_S = "52946880266549";
const NAVY_3XL = "52946881249589";
const INTENT = "ai_variantBindTest01";

describe("personalizedShopifyVariantsFromShopConfig", () => {
  it("stays in lockstep with wired shop-config personalize variants", () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "site/data/shop-config.json"), "utf8")
    ) as unknown;
    const fromConfig = personalizedShopifyVariantsFromShopConfig(config);
    expect(fromConfig.length).toBeGreaterThan(0);
    expect([...PERSONALIZED_SHOPIFY_VARIANT_BINDINGS]).toEqual(fromConfig);
  });
});

describe("collectPaidShopifyVariantIdsForIntent", () => {
  it("prefers lines tagged with the intent id", () => {
    const ids = collectPaidShopifyVariantIdsForIntent(
      {
        line_items: [
          { variant_id: Number(NAVY_3XL), quantity: 1 },
          {
            variant_id: Number(NAVY_S),
            quantity: 1,
            properties: [{ name: "artifact_intent_id", value: INTENT }],
          },
        ],
      },
      INTENT
    );
    expect(ids).toEqual([NAVY_S]);
  });
});

describe("validateIntentPaidShopifyVariants", () => {
  it("allows matching paid hoodie variant", () => {
    const result = validateIntentPaidShopifyVariants(
      { product_id: "glitch_hoodie_v1", print_variant_id: "navy-s" },
      {
        line_items: [
          {
            variant_id: Number(NAVY_S),
            properties: [{ name: "artifact_intent_id", value: INTENT }],
          },
        ],
      },
      INTENT
    );
    expect(result).toEqual({ ok: true });
  });

  it("holds when paid Shopify size does not match intent print_variant_id", () => {
    const result = validateIntentPaidShopifyVariants(
      { product_id: "glitch_hoodie_v1", print_variant_id: "navy-3xl" },
      {
        line_items: [
          {
            variant_id: Number(NAVY_S),
            properties: [{ name: "artifact_intent_id", value: INTENT }],
          },
        ],
      },
      INTENT
    );
    expect(result).toEqual({
      ok: false,
      hold_reason: ARTIFACT_INTENT_VARIANT_MISMATCH,
    });
  });

  it("holds unknown paid variant ids when the intent names a print spec", () => {
    const result = validateIntentPaidShopifyVariants(
      { product_id: "glitch_hoodie_v1", print_variant_id: "navy-s" },
      {
        line_items: [
          {
            variant_id: 999,
            properties: [{ name: "artifact_intent_id", value: INTENT }],
          },
        ],
      },
      INTENT
    );
    expect(result).toEqual({
      ok: false,
      hold_reason: ARTIFACT_INTENT_VARIANT_MISMATCH,
    });
  });

  it("skips when the intent has no print_variant_id or lines omit variant_id", () => {
    expect(
      validateIntentPaidShopifyVariants(
        { product_id: "prod_sticker_square", print_variant_id: null },
        {
          line_items: [
            {
              variant_id: Number(NAVY_S),
              properties: [{ name: "artifact_intent_id", value: INTENT }],
            },
          ],
        },
        INTENT
      )
    ).toEqual({ ok: true });

    expect(
      validateIntentPaidShopifyVariants(
        { product_id: "glitch_hoodie_v1", print_variant_id: "navy-s" },
        {
          line_items: [
            {
              properties: [{ name: "artifact_intent_id", value: INTENT }],
            },
          ],
        },
        INTENT
      )
    ).toEqual({ ok: true });
  });
});
