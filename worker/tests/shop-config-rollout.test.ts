import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareShopConfigDrift,
  validateShopConfig,
} from "../../site/js/shop-config-rollout-core.mjs";

const repoRoot = join(import.meta.dirname, "../..");

const launchReadyConfig = {
  version: 1,
  site_origin: "https://humanity.llc",
  tier0: {
    checkout_open: true,
    checkout_url: "https://store.example/cart/111:1",
  },
  personalize: {
    checkout_open: true,
    checkout_product_id: "sticker_personalized_v1",
    products: [
      {
        product_id: "sticker_personalized_v1",
        print_template_id: "hc-sticker-square-v1",
        shopify_variant_id: "222",
        checkout_url: "https://store.example/cart/222:1",
      },
    ],
  },
};

describe("validateShopConfig", () => {
  it("passes when launch SKU has checkout_url and gates are open", () => {
    const result = validateShopConfig(launchReadyConfig, { strictLaunch: true });
    expect(result.ok).toBe(true);
    expect(result.launchSkuReady).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("strictLaunch fails when checkout_open but launch SKU missing checkout_url", () => {
    const result = validateShopConfig(
      {
        ...launchReadyConfig,
        personalize: {
          ...launchReadyConfig.personalize,
          products: [
            {
              product_id: "sticker_personalized_v1",
              print_template_id: "hc-sticker-square-v1",
              shopify_variant_id: "",
              checkout_url: "",
            },
          ],
        },
      },
      { strictLaunch: true }
    );
    expect(result.ok).toBe(false);
    expect(result.launchSkuReady).toBe(false);
    expect(result.errors.some((e) => e.includes("launch SKU"))).toBe(true);
  });

  it("warns on tier0 checkout_open without checkout_url", () => {
    const result = validateShopConfig({
      tier0: { checkout_open: true, checkout_url: "" },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("tier0"))).toBe(true);
  });

  it("warns when variant id mismatches cart permalink", () => {
    const result = validateShopConfig({
      personalize: {
        checkout_open: true,
        checkout_product_id: "sticker_personalized_v1",
        products: [
          {
            product_id: "sticker_personalized_v1",
            shopify_variant_id: "999",
            checkout_url: "https://store.example/cart/222:1",
          },
        ],
      },
    });
    expect(result.warnings.some((w) => w.includes("does not match"))).toBe(true);
  });
});

describe("compareShopConfigDrift", () => {
  it("reports checkout_open drift between repo and deployed config", () => {
    const warnings = compareShopConfigDrift(
      { personalize: { checkout_open: true } },
      { personalize: { checkout_open: false } }
    );
    expect(warnings.some((w) => w.includes("personalize.checkout_open drift"))).toBe(true);
  });
});

describe("merch-funnel rollout npm scripts", () => {
  it("exposes rollout steps and verify:merch-funnel bundle", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["merch-funnel:rollout:step1"]).toContain("merch-funnel-rollout-step1.mjs");
    expect(pkg.scripts["merch-funnel:rollout:step6"]).toContain("merch-funnel-rollout-step6.mjs");
    expect(pkg.scripts["verify:merch-funnel"]).toContain("worker:test:merch-funnel");
    expect(pkg.scripts["verify:merch-funnel"]).toContain("shop-config-rollout.test.ts");
  });
});
