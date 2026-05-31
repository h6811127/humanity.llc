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
    expect(hubHtml).not.toMatch(/—/);
    expect(hubHtml).toContain("Chromatic glitch units");
    expect(hubHtml).toContain("See example");
    expect(hubHtml).toContain("glitch-print-chromatic-unit-example");
    expect(hubHtml).not.toContain("glitch-hoodie-live-object-white-card");
    expect(foundingHtml).not.toMatch(/Ready to order/i);
    expect(foundingHtml).toContain('id="shop-checkout-lead"');
    expect(foundingHtml).toContain("restore root card and");
    expect(foundingHtml).toContain("object QR control");
  });

  it("post-purchase copy reminds card owners that root backup controls printed object QRs", () => {
    const thanksHtml = readFileSync(join(process.cwd(), "site/shop/thanks/index.html"), "utf8");
    expect(thanksHtml).toContain("created a root card");
    expect(thanksHtml).toContain("personalized object QRs");
  });

  it("exposes ready-to-order copy only for JS when checkout opens", () => {
    expect(SHOP_CHECKOUT_READY_LEAD).toMatch(/Ready to order/i);
  });
});
