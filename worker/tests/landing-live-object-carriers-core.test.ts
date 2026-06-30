import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  LANDING_CARRIERS_DEFAULT_PRODUCT_ID,
  LANDING_CARRIERS_SUBTITLE_BASE,
  buildLandingCarriersViewModel,
  landingCarriersShortTitle,
  landingCarriersStatusClass,
  resolveLandingFeaturedProductId,
} from "../../site/js/landing-live-object-carriers-core.mjs";
import { FOUNDING_PURSE_STORE_PRODUCT_ID } from "../../site/js/shop-store-catalog-ids.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const shopConfig = JSON.parse(
  readFileSync(join(root, "site/data/shop-config.json"), "utf8")
);

const GLITCH_CATALOG = {
  products: [
    {
      template_id: "hc-glitch-hoodie-v1",
      type: "hoodie",
      variants: [{ variant_id: "black-m", enabled: true }],
    },
  ],
};

describe("landing-live-object-carriers-core", () => {
  it("defaults featured product to glitch hoodie", () => {
    expect(resolveLandingFeaturedProductId({})).toBe(LANDING_CARRIERS_DEFAULT_PRODUCT_ID);
    expect(resolveLandingFeaturedProductId(shopConfig)).toBe("glitch_hoodie_v1");
  });

  it("shortens catalog titles for the row headline", () => {
    expect(landingCarriersShortTitle("Glitch LIVE QR hoodie")).toBe("Glitch hoodie");
    expect(landingCarriersShortTitle("Founding LIVE OBJECT purse")).toBe("Founding purse");
  });

  it("builds view model from shop-config personalize checkout_product_id", () => {
    const model = buildLandingCarriersViewModel(shopConfig);
    expect(model).not.toBeNull();
    expect(model?.productId).toBe("glitch_hoodie_v1");
    expect(model?.shortTitle).toBe("Glitch hoodie");
    expect(model?.subtitle).toContain(LANDING_CARRIERS_SUBTITLE_BASE);
    expect(model?.subtitle).toContain("$98 + shipping");
    expect(model?.actionPath).toBe("/shop/customize/?product=glitch_hoodie_v1");
    expect(model?.ctaLabel).toBe("Customize Glitch hoodie");
    expect(model?.imageSrc).toContain("/images/landing/navy-glitch-hoodie-transparent-back.jpg");
  });

  it("marks checkout live when catalog + shop-config gate is open", () => {
    const model = buildLandingCarriersViewModel(shopConfig, GLITCH_CATALOG, []);
    expect(model?.availability).toBe("checkout");
    expect(model?.availabilityLabel).toBe("Checkout live");
    expect(landingCarriersStatusClass({ availability: model?.availability })).toBe(
      " landing-carriers-feature-status--live"
    );
  });

  it("shows preview when personalize checkout is gated off", () => {
    const gated = {
      ...shopConfig,
      personalize: {
        ...shopConfig.personalize,
        checkout_open: false,
      },
    };
    const model = buildLandingCarriersViewModel(gated, GLITCH_CATALOG, []);
    expect(model?.availability).toBe("preview");
    expect(model?.availabilityLabel).toBe("Preview live · checkout opening soon");
  });

  it("follows checkout_product_id when operator switches featured SKU", () => {
    const purseConfig = {
      ...shopConfig,
      personalize: {
        ...shopConfig.personalize,
        checkout_product_id: FOUNDING_PURSE_STORE_PRODUCT_ID,
      },
    };
    const model = buildLandingCarriersViewModel(purseConfig);
    expect(model?.productId).toBe(FOUNDING_PURSE_STORE_PRODUCT_ID);
    expect(model?.shortTitle).toBe("Founding purse");
    expect(model?.actionPath).toBe(
      `/shop/customize/?product=${encodeURIComponent(FOUNDING_PURSE_STORE_PRODUCT_ID)}`
    );
    expect(model?.imageSrc).toContain("/images/merch/founding-purse/front-styled.png");
  });

  it("prefers store row CTA copy when enrichment rows are present", () => {
    const rows = [
      {
        row_id: "row_personalize",
        products: [
          {
            product_id: "glitch_hoodie_v1",
            title: "Glitch LIVE QR hoodie",
            product_class: "personalized",
            cta_label: "Customize your QR",
            price_display: "$98 + shipping",
          },
        ],
      },
    ];
    const model = buildLandingCarriersViewModel(shopConfig, GLITCH_CATALOG, rows);
    expect(model?.ctaLabel).toBe("Customize your QR");
  });

  it("returns null when featured product is absent from personalize.products", () => {
    const missing = {
      personalize: {
        checkout_product_id: "unknown_product_v1",
        products: shopConfig.personalize.products,
      },
    };
    expect(buildLandingCarriersViewModel(missing)).toBeNull();
  });
});
