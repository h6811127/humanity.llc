import { describe, expect, it } from "vitest";

import { qrFrameMetrics } from "../../site/js/qr-branding.mjs";
import {
  buildPlannedItemScanUrl,
  buildShopifyCartUrl,
  customizeMerchCheckoutStatusMessage,
  customizeStickerMockLayout,
  isPersonalizeCheckoutReady,
  loadCardSessionForCustomize,
  personalizeProductDisplay,
  personalizeProducts,
  readManifestoLineForCustomize,
  resolveCustomizePreviewKind,
  STICKER_MOCK_CARD_WIDTH_IN,
  STICKER_MOCK_SHEET_IN,
} from "../../site/js/shop-customize-core.mjs";

describe("buildShopifyCartUrl", () => {
  it("updates cart quantity and appends line properties", () => {
    const url = buildShopifyCartUrl(
      "https://store.example/cart/123456:1",
      2,
      [
        { key: "artifact_intent_id", value: "ai_test123" },
        { key: "profile_id", value: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5" },
      ]
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/cart/123456:2");
    expect(parsed.searchParams.get("properties[artifact_intent_id]")).toBe("ai_test123");
    expect(parsed.searchParams.get("properties[profile_id]")).toBe("7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
  });
});

describe("customizeStickerMockLayout", () => {
  it("uses portrait card aspect on a square 3×3 sheet tier", () => {
    const qrModuleSize = 220;
    const layout = customizeStickerMockLayout(qrModuleSize);
    const frame = qrFrameMetrics(qrModuleSize);
    expect(layout.sheetAspect).toBe(1);
    expect(layout.cardAspect).toBe(frame.totalWidth / frame.totalHeight);
    expect(layout.cardAspect).toBeGreaterThan(0.8);
    expect(layout.cardAspect).toBeLessThan(1);
    expect(layout.cardWidthPct).toBe(
      (STICKER_MOCK_CARD_WIDTH_IN / STICKER_MOCK_SHEET_IN) * 100
    );
  });
});

describe("readManifestoLineForCustomize", () => {
  it("reads manifesto_line from hc_created", () => {
    const storage = {
      sessionStorage: {
        getItem: (key) =>
          key === "hc_created"
            ? JSON.stringify({ manifesto_line: "  Back soon  " })
            : null,
      },
    };
    expect(readManifestoLineForCustomize(storage)).toBe("Back soon");
  });
});

describe("buildPlannedItemScanUrl", () => {
  it("builds official scan path for planned item qr", () => {
    expect(
      buildPlannedItemScanUrl("abc123", "qr_planned001", "https://humanity.llc")
    ).toBe("https://humanity.llc/c/abc123?q=qr_planned001");
  });
});

describe("isPersonalizeCheckoutReady", () => {
  it("requires global checkout_open and product checkout_url", () => {
    const product = {
      product_id: "hoodie_live_object_v1",
      checkout_url: "https://store.example/cart/99:1",
    };
    expect(isPersonalizeCheckoutReady({ personalize: { checkout_open: false } }, product)).toBe(
      false
    );
    expect(isPersonalizeCheckoutReady({ personalize: { checkout_open: true } }, product)).toBe(
      true
    );
    expect(
      isPersonalizeCheckoutReady({ personalize: { checkout_open: true } }, {
        ...product,
        checkout_open: false,
      })
    ).toBe(false);
  });

  it("gates checkout to launch SKU when checkout_product_id is set", () => {
    const sticker = {
      product_id: "sticker_personalized_v1",
      checkout_url: "https://store.example/cart/99:1",
    };
    const hoodie = {
      product_id: "hoodie_live_object_v1",
      checkout_url: "https://store.example/cart/88:1",
    };
    const config = {
      personalize: {
        checkout_open: true,
        checkout_product_id: "sticker_personalized_v1",
      },
    };
    expect(isPersonalizeCheckoutReady(config, sticker)).toBe(true);
    expect(isPersonalizeCheckoutReady(config, hoodie)).toBe(false);
  });
});

describe("resolveCustomizePreviewKind", () => {
  it("maps glitch product id and preview token", () => {
    expect(resolveCustomizePreviewKind({ product_id: "glitch_hoodie_v1" })).toBe("glitch_hoodie");
    expect(
      resolveCustomizePreviewKind({ product_id: "glitch_hoodie_v1", preview: "glitch_hoodie" })
    ).toBe("glitch_hoodie");
    expect(resolveCustomizePreviewKind({ product_id: "hoodie_live_object_v1" })).toBe("hoodie");
    expect(resolveCustomizePreviewKind({ product_id: "sticker_personalized_v1", preview: "sticker" })).toBe(
      "sticker"
    );
  });
});

describe("personalizeProductDisplay", () => {
  it("preserves glitch_hoodie preview kind", () => {
    expect(
      personalizeProductDisplay({
        product_id: "glitch_hoodie_v1",
        preview: "glitch_hoodie",
        title: "Glitch LIVE QR hoodie",
      }).preview
    ).toBe("glitch_hoodie");
  });
});

describe("personalizeProducts", () => {
  it("filters products with product_id", () => {
    expect(
      personalizeProducts({
        personalize: {
          products: [{ product_id: "a" }, { title: "bad" }, null],
        },
      })
    ).toEqual([{ product_id: "a" }]);
  });
});

describe("loadCardSessionForCustomize", () => {
  it("reads hc_created when keys present", () => {
    const storage = {
      sessionStorage: {
        getItem(key) {
          if (key === "hc_created") {
            return JSON.stringify({
              profile_id: "prof1",
              qr_id: "qr_1",
              handle: "river",
              owner_private_key_b58: "k",
              owner_public_key_b58: "pubk",
            });
          }
          return null;
        },
      },
      localStorage: { getItem: () => null },
    };
    expect(loadCardSessionForCustomize(storage)).toEqual({
      profile_id: "prof1",
      qr_id: "qr_1",
      handle: "river",
      scan_url: null,
    });
  });

  it("falls back to wallet entry", () => {
    const storage = {
      sessionStorage: { getItem: () => null },
      localStorage: {
        getItem(key) {
          if (key === "hc_wallet") {
            return JSON.stringify([
              {
                profile_id: "p2",
                qr_id: "qr_2",
                recovery_private_key_b58: "r",
                recovery_public_key_b58: "pubr",
              },
            ]);
          }
          return null;
        },
      },
    };
    expect(loadCardSessionForCustomize(storage)?.profile_id).toBe("p2");
  });
});

describe("customizeMerchCheckoutStatusMessage", () => {
  const consentComplete = new Set([
    "commerce_not_verification",
    "bearer_not_ownership",
    "persistence_revocable",
  ]);

  it("prompts recovery when consent is complete but seatbelt is missing", () => {
    const storage = {
      sessionStorage: {
        getItem(key: string) {
          if (key !== "hc_created") return null;
          return JSON.stringify({
            profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
            owner_private_key_b58: "k",
          });
        },
      },
      localStorage: { getItem: () => null },
    };
    expect(
      customizeMerchCheckoutStatusMessage({
        checkoutOpen: true,
        consentCheckedIds: consentComplete,
        storage,
      })
    ).toContain("Save a recovery method below");
  });

  it("shows proof approved when seatbelt is satisfied", () => {
    const storage = {
      sessionStorage: {
        getItem(key: string) {
          if (key !== "hc_created") return null;
          return JSON.stringify({
            profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
            owner_private_key_b58: "k",
            recovery_key_acknowledged: true,
          });
        },
      },
      localStorage: { getItem: () => null },
    };
    expect(
      customizeMerchCheckoutStatusMessage({
        checkoutOpen: true,
        consentCheckedIds: consentComplete,
        storage,
      })
    ).toContain("Proof approved");
  });
});
