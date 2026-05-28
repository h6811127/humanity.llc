import { describe, expect, it } from "vitest";

import {
  isTier0CheckoutOpen,
  merchThanksPageUrl,
  tier0ThanksPageUrl,
} from "../../site/js/shop-config.mjs";

describe("tier0ThanksPageUrl", () => {
  it("uses site_origin and thanks_path from config", () => {
    expect(
      tier0ThanksPageUrl({
        site_origin: "https://humanity.llc",
        thanks_path: "/shop/thanks/",
      })
    ).toBe("https://humanity.llc/shop/thanks/");
  });

  it("falls back to location origin when site_origin unset", () => {
    expect(
      tier0ThanksPageUrl({ thanks_path: "/shop/thanks/" }, "http://localhost:8788")
    ).toBe("http://localhost:8788/shop/thanks/");
  });

  it("defaults thanks path when missing", () => {
    expect(tier0ThanksPageUrl({ site_origin: "https://humanity.llc" })).toBe(
      "https://humanity.llc/shop/thanks/"
    );
  });
});

describe("merchThanksPageUrl", () => {
  it("appends hc_ref for Tier 0 Glitch post-purchase", () => {
    expect(
      merchThanksPageUrl(
        { site_origin: "https://humanity.llc", thanks_path: "/shop/thanks/" },
        "tier0_glitch"
      )
    ).toBe("https://humanity.llc/shop/thanks/?hc_ref=tier0_glitch");
  });
});

describe("isTier0CheckoutOpen", () => {
  it("requires boolean true and non-empty checkout_url", () => {
    expect(
      isTier0CheckoutOpen({
        tier0: { checkout_open: true, checkout_url: "https://store.example/cart/1:1" },
      })
    ).toBe(true);
    expect(
      isTier0CheckoutOpen({
        tier0: { checkout_open: true, checkout_url: "" },
      })
    ).toBe(false);
    expect(
      isTier0CheckoutOpen({
        tier0: { checkout_open: "true", checkout_url: "https://store.example/cart/1:1" },
      })
    ).toBe(false);
  });
});
