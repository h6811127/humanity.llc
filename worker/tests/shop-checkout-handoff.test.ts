import { describe, expect, it, vi } from "vitest";

import {
  goToShopifyCheckout,
  isAllowedCheckoutUrl,
} from "../../site/js/shop-checkout-handoff.mjs";

describe("shop-checkout-handoff", () => {
  it("accepts https checkout URLs", () => {
    expect(isAllowedCheckoutUrl("https://store.myshopify.com/cart/123:1")).toBe(true);
    expect(isAllowedCheckoutUrl("http://localhost/cart/1:1")).toBe(true);
  });

  it("rejects invalid checkout URLs", () => {
    expect(isAllowedCheckoutUrl("")).toBe(false);
    expect(isAllowedCheckoutUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedCheckoutUrl("not-a-url")).toBe(false);
  });

  it("navigates in the same tab via assign", () => {
    const assign = vi.fn();
    goToShopifyCheckout("https://store.myshopify.com/cart/123:1", { assign });
    expect(assign).toHaveBeenCalledWith("https://store.myshopify.com/cart/123:1");
  });

  it("throws when navigation is unavailable", () => {
    expect(() => goToShopifyCheckout("https://store.myshopify.com/cart/123:1", {})).toThrow(
      /navigation unavailable/i
    );
  });
});
