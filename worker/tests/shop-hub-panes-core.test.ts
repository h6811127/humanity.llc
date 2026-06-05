import { describe, expect, it } from "vitest";

import {
  SHOP_FEATURE_PANE,
  SHOP_FEATURE_PRODUCT_ID,
  SHOP_PURSE_PANE,
  SHOP_PURSE_PRODUCT_ID,
  SHOP_STICKER_PANE,
  SHOP_STICKER_PRODUCT_ID,
  SHOP_PANE_PRODUCT_IDS,
  applyFeaturePaneProduct,
  applyPursePaneProduct,
  applyStickerPaneProduct,
  filterProductFromStoreRows,
  findProductInStoreRows,
  hydrateProductPanes,
  resolveFeaturePaneProduct,
  resolvePursePaneProduct,
  resolveStickerPaneProduct,
} from "../../site/js/shop-hub-panes-core.mjs";

const ROWS = [
  {
    row_id: "row_personalize",
    title: "Make it yours",
    products: [
      {
        product_id: SHOP_FEATURE_PRODUCT_ID,
        title: "Glitch LIVE QR hoodie",
        meaning_line: "Founding Glitch art on your chest.",
        product_class: "personalized",
        personalization_indicator: "Personalized QR",
        price_display: "$98 + shipping",
        cta_label: "Customize your QR",
      },
      {
        product_id: SHOP_PURSE_PRODUCT_ID,
        title: "Founding LIVE OBJECT purse",
        meaning_line: "The 2023 prototype satchel.",
        product_class: "personalized",
        personalization_indicator: "Personalized QR",
        price_display: "Preview · price at launch",
        cta_label: "Preview your QR",
      },
    ],
  },
  {
    row_id: "row_founding",
    title: "Founding objects",
    products: [
      {
        product_id: SHOP_STICKER_PRODUCT_ID,
        title: "Founding signal sticker",
        product_class: "limited_drop",
        personalization_indicator: "Limited Drop",
        meaning_line: "Batch campaign QR. Curiosity, not a passport.",
        cta_label: "View product",
      },
    ],
  },
];

describe("shop-hub-panes-core", () => {
  it("lists pane product ids in scroll order", () => {
    expect(SHOP_PANE_PRODUCT_IDS).toEqual([
      SHOP_FEATURE_PRODUCT_ID,
      SHOP_PURSE_PRODUCT_ID,
      SHOP_STICKER_PRODUCT_ID,
    ]);
  });

  it("finds products in store rows", () => {
    expect(findProductInStoreRows(ROWS, SHOP_FEATURE_PRODUCT_ID)?.title).toBe(
      "Glitch LIVE QR hoodie"
    );
    expect(findProductInStoreRows(ROWS, SHOP_PURSE_PRODUCT_ID)?.title).toBe(
      "Founding LIVE OBJECT purse"
    );
  });

  it("filters pane products out of rendered rows", () => {
    const filtered = filterProductFromStoreRows(ROWS, SHOP_PANE_PRODUCT_IDS);
    expect(filtered).toHaveLength(0);
  });

  it("resolves glitch hoodie availability and price from shop config", () => {
    const product = resolveFeaturePaneProduct(
      {
        personalize: { checkout_open: false, checkout_product_id: SHOP_FEATURE_PRODUCT_ID },
        products: [
          {
            product_id: SHOP_FEATURE_PRODUCT_ID,
            checkout_open: false,
            price_display: "$98 + shipping",
          },
        ],
      },
      { products: [{ product_id: SHOP_FEATURE_PRODUCT_ID, print_template_id: "hc-glitch-hoodie-v1" }] },
      ROWS
    );
    expect(product.availability).toBe("preview");
    expect(product.price_display).toBe("$98 + shipping");
    expect(product.action_path).toBe(`/shop/customize/?product=${SHOP_FEATURE_PRODUCT_ID}`);
  });

  it("resolves founding purse preview path and copy", () => {
    const product = resolvePursePaneProduct({}, { products: [] }, ROWS);
    expect(product.availability).toBe("preview");
    expect(product.action_path).toBe(`/shop/customize/?product=${SHOP_PURSE_PRODUCT_ID}`);
    expect(product.cta_label).toBe("Preview your QR");
    expect(product.meaning_line).toBe("The 2023 prototype satchel.");
  });

  it("resolves founding sticker tier 0 path and copy", () => {
    const product = resolveStickerPaneProduct({}, { products: [] }, ROWS);
    expect(product.availability).toBe("coming_soon");
    expect(product.action_path).toBe("/shop/founding/");
    expect(product.cta_label).toBe("View product");
    expect(product.personalization_indicator).toBe("Limited Drop");
    expect(product.price_display).toBe("Preview only");
  });

  it("hydrates feature, purse, and sticker pane DOM fields", () => {
    const nodes: Record<string, { textContent?: string; href?: string; className?: string }> = {
      [SHOP_FEATURE_PANE.pane_id]: {},
      "shop-feature-title": {},
      "shop-feature-badge": {},
      "shop-feature-lead": {},
      "shop-feature-price": { className: "shop-pane__price" },
      "shop-feature-status": { className: "shop-pane__status" },
      "shop-feature-cta": { href: "/shop/" },
      [SHOP_PURSE_PANE.pane_id]: {},
      "shop-purse-title": {},
      "shop-purse-badge": {},
      "shop-purse-lead": {},
      "shop-purse-price": { className: "shop-pane__price" },
      "shop-purse-status": { className: "shop-pane__status" },
      "shop-purse-cta": { href: "/shop/" },
      [SHOP_STICKER_PANE.pane_id]: {},
      "shop-sticker-title": {},
      "shop-sticker-badge": {},
      "shop-sticker-lead": {},
      "shop-sticker-price": { className: "shop-pane__price" },
      "shop-sticker-status": { className: "shop-pane__status" },
      "shop-sticker-cta": { href: "/shop/" },
    };
    const doc = {
      getElementById(id: string) {
        return nodes[id] ?? null;
      },
    };

    hydrateProductPanes({}, { products: [] }, ROWS, doc as unknown as Document);

    expect(nodes["shop-feature-cta"].textContent).toBe("Customize your QR");
    expect(nodes["shop-purse-cta"].textContent).toBe("Preview your QR");
    expect(nodes["shop-sticker-cta"].href).toBe("/shop/founding/");
    expect(nodes["shop-sticker-status"].textContent).toBe("Coming soon");
  });

  it("hydrates feature pane via legacy helper", () => {
    const nodes: Record<string, { textContent?: string; href?: string; className?: string }> = {
      [SHOP_FEATURE_PANE.pane_id]: {},
      "shop-feature-title": {},
      "shop-feature-badge": {},
      "shop-feature-lead": {},
      "shop-feature-price": { className: "shop-pane__price" },
      "shop-feature-status": { className: "shop-pane__status" },
      "shop-feature-cta": { href: "/shop/" },
    };
    const doc = {
      getElementById(id: string) {
        return nodes[id] ?? null;
      },
    };

    applyFeaturePaneProduct(
      {
        title: "Glitch LIVE QR hoodie",
        personalization_indicator: "Personalized QR",
        meaning_line: "Your unique QR, your live line.",
        price_display: "$98 + shipping",
        availability: "preview",
        action_path: `/shop/customize/?product=${SHOP_FEATURE_PRODUCT_ID}`,
        cta_label: "Customize Glitch hoodie",
      },
      doc as unknown as Document
    );

    expect(nodes["shop-feature-cta"].textContent).toBe("Customize Glitch hoodie");
  });

  it("hydrates purse pane via dedicated helper", () => {
    const nodes: Record<string, { textContent?: string; href?: string; className?: string }> = {
      [SHOP_PURSE_PANE.pane_id]: {},
      "shop-purse-title": {},
      "shop-purse-badge": {},
      "shop-purse-lead": {},
      "shop-purse-price": { className: "shop-pane__price" },
      "shop-purse-status": { className: "shop-pane__status" },
      "shop-purse-cta": { href: "/shop/" },
    };
    const doc = {
      getElementById(id: string) {
        return nodes[id] ?? null;
      },
    };

    applyPursePaneProduct(
      {
        title: "Founding LIVE OBJECT purse",
        personalization_indicator: "Personalized QR",
        meaning_line: "Preview your live line before checkout opens.",
        price_display: "Preview · price at launch",
        availability: "preview",
        action_path: `/shop/customize/?product=${SHOP_PURSE_PRODUCT_ID}`,
        cta_label: "Preview founding purse",
      },
      doc as unknown as Document
    );

    expect(nodes["shop-purse-cta"].textContent).toBe("Preview founding purse");
    expect(nodes["shop-purse-cta"].href).toBe(`/shop/customize/?product=${SHOP_PURSE_PRODUCT_ID}`);
  });

  it("hydrates sticker pane via dedicated helper", () => {
    const nodes: Record<string, { textContent?: string; href?: string; className?: string }> = {
      [SHOP_STICKER_PANE.pane_id]: {},
      "shop-sticker-title": {},
      "shop-sticker-badge": {},
      "shop-sticker-lead": {},
      "shop-sticker-price": { className: "shop-pane__price" },
      "shop-sticker-status": { className: "shop-pane__status" },
      "shop-sticker-cta": { href: "/shop/" },
    };
    const doc = {
      getElementById(id: string) {
        return nodes[id] ?? null;
      },
    };

    applyStickerPaneProduct(
      {
        title: "Founding signal sticker",
        personalization_indicator: "Limited Drop",
        meaning_line: "Batch campaign QR. Curiosity, not a passport.",
        price_display: "Preview only",
        availability: "preview",
        action_path: "/shop/founding/",
        cta_label: "Preview founding sticker",
      },
      doc as unknown as Document
    );

    expect(nodes["shop-sticker-cta"].textContent).toBe("Preview founding sticker");
    expect(nodes["shop-sticker-status"].textContent).toBe(
      "Preview live · checkout opening soon"
    );
  });
});
