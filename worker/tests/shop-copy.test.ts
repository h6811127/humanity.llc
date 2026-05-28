import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  SHOP_CHECKOUT_PENDING_LABEL,
  SHOP_CHECKOUT_READY_LEAD,
  shopPriceLabelWhenCheckoutClosed,
} from "../../site/js/shop-copy-core.mjs";

describe("shop-copy-core", () => {
  it("uses pending label when checkout is closed", () => {
    expect(shopPriceLabelWhenCheckoutClosed(null)).toBe(SHOP_CHECKOUT_PENDING_LABEL);
    expect(shopPriceLabelWhenCheckoutClosed("$12")).toBe("$12 · checkout soon");
  });

  it("does not embed ready-to-order copy in shop HTML shell", () => {
    const hubHtml = readFileSync(join(process.cwd(), "site/shop/index.html"), "utf8");
    const foundingHtml = readFileSync(join(process.cwd(), "site/shop/founding/index.html"), "utf8");
    expect(hubHtml).not.toMatch(/Ready to order/i);
    expect(foundingHtml).not.toMatch(/Ready to order/i);
    expect(foundingHtml).toContain('id="shop-checkout-lead"');
  });

  it("exposes ready-to-order copy only for JS when checkout opens", () => {
    expect(SHOP_CHECKOUT_READY_LEAD).toMatch(/Ready to order/i);
  });
});
