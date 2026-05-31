/**
 * Story-row storefront seed — SF-001 skeleton.
 * Represents ~50 product records; launch exposes only published rows/products.
 * See docs/features/Storefront v1.0.md § 11.
 */

import {
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  STICKER_PERSONALIZED_STORE_PRODUCT_ID,
  DEFAULT_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../print/print-catalog";

export type StoreProductClass = "general" | "personalized" | "limited_drop";
export type StoreRowStatus = "draft" | "published" | "hidden";
export type StoreProductStatus = "draft" | "published" | "hidden";
export type StoreFulfillmentProvider = "printify" | "manual" | "digital" | "none";
export type StorePersonalizationIndicator = "General" | "Personalized QR" | "Limited Drop";

export interface StoreCatalogProduct {
  product_id: string;
  title: string;
  meaning_line: string;
  story: string;
  product_class: StoreProductClass;
  personalization_indicator: StorePersonalizationIndicator;
  requires_card: boolean;
  supports_personalization: boolean;
  fulfillment_provider: StoreFulfillmentProvider;
  print_template_id: string | null;
  price_display: string | null;
  detail_path: string;
  cta_label: string;
  status: StoreProductStatus;
  row_ids: string[];
}

export interface StoreCatalogRow {
  row_id: string;
  title: string;
  subtitle: string | null;
  story: string;
  product_ids: string[];
  sort_order: number;
  status: StoreRowStatus;
}

export const TIER0_FOUNDING_STORE_PRODUCT_ID = "tier0_founding_sticker_v1";
export const TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID = "tier0_glitch_hoodie_v1";

export { GLITCH_HOODIE_STORE_PRODUCT_ID };

/** Legacy shared-batch Glitch PDP → Tier 1 personalize launch SKU. */
const LEGACY_STORE_PRODUCT_REDIRECTS: Record<string, string> = {
  [TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID]: GLITCH_HOODIE_STORE_PRODUCT_ID,
};

export function getLegacyStoreProductRedirect(productId: string): string | null {
  const id = productId.trim();
  if (!id) return null;
  return LEGACY_STORE_PRODUCT_REDIRECTS[id] ?? null;
}

export function storeProductDetailPath(productId: string): string {
  const id = productId.trim();
  return `/shop/products/${encodeURIComponent(id)}/`;
}

export function storeProductActionPath(product: StoreCatalogProduct): string {
  if (product.product_id === TIER0_FOUNDING_STORE_PRODUCT_ID) {
    return "/shop/founding/";
  }
  if (product.product_class === "personalized") {
    return `/shop/customize/?product=${encodeURIComponent(product.product_id)}`;
  }
  return storeProductDetailPath(product.product_id);
}

const LAUNCH_PRODUCTS: StoreCatalogProduct[] = [
  {
    product_id: GLITCH_HOODIE_STORE_PRODUCT_ID,
    title: "Glitch LIVE QR hoodie",
    meaning_line: "Founding Glitch art on your chest — your unique QR, your live line.",
    story:
      "Fixed Glitch garment design with a unique revocable QR tied to your Humanity Card. Change what strangers read from your phone without reprinting. Commerce does not verify you or grant a vouch.",
    product_class: "personalized",
    personalization_indicator: "Personalized QR",
    requires_card: true,
    supports_personalization: true,
    fulfillment_provider: "printify",
    print_template_id: GLITCH_HOODIE_TEMPLATE_ID,
    price_display: "$98 + shipping",
    detail_path: storeProductDetailPath(GLITCH_HOODIE_STORE_PRODUCT_ID),
    cta_label: "Customize your QR",
    status: "published",
    row_ids: ["row_personalize"],
  },
  {
    product_id: STICKER_PERSONALIZED_STORE_PRODUCT_ID,
    title: "Personalized sticker",
    meaning_line: "Square sticker with your unique LIVE OBJECT QR.",
    story:
      "Tier 1 belonging — each physical sticker gets a unique revocable code. Update what strangers see from your phone without reprinting.",
    product_class: "personalized",
    personalization_indicator: "Personalized QR",
    requires_card: true,
    supports_personalization: true,
    fulfillment_provider: "printify",
    print_template_id: DEFAULT_PRINT_TEMPLATE_ID,
    price_display: "$12 + shipping",
    detail_path: storeProductDetailPath(STICKER_PERSONALIZED_STORE_PRODUCT_ID),
    cta_label: "View product",
    status: "published",
    row_ids: ["row_personalize"],
  },
  {
    product_id: HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID,
    title: "Live Object hoodie",
    meaning_line: "Your unique QR on the chest — you change what strangers read; the ink stays.",
    story:
      "Tier 1 belonging wear — each hoodie gets its own revocable print artifact tied to your Humanity Card. Update your live line from your phone without reprinting. Lose signing access without recovery and the scan can become a fixed record of the last thing you published.",
    product_class: "personalized",
    personalization_indicator: "Personalized QR",
    requires_card: true,
    supports_personalization: true,
    fulfillment_provider: "printify",
    print_template_id: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
    price_display: "$48 + shipping",
    detail_path: storeProductDetailPath(HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID),
    cta_label: "View product",
    status: "published",
    row_ids: ["row_personalize"],
  },
  {
    product_id: TIER0_FOUNDING_STORE_PRODUCT_ID,
    title: "Founding signal sticker",
    meaning_line: "Batch campaign QR — curiosity, not a passport.",
    story:
      "Tier 0 founding drop — one design with a shared campaign QR. A pointer to the experiment; no card required to order.",
    product_class: "limited_drop",
    personalization_indicator: "Limited Drop",
    requires_card: false,
    supports_personalization: false,
    fulfillment_provider: "printify",
    print_template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
    price_display: null,
    detail_path: storeProductDetailPath(TIER0_FOUNDING_STORE_PRODUCT_ID),
    cta_label: "View product",
    status: "published",
    row_ids: ["row_founding"],
  },
  {
    product_id: TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
    title: "Glitch LIVE QR hoodie (legacy shared batch)",
    meaning_line: "Deprecated — shared campaign QR on every unit. Launch uses personalized Glitch.",
    story:
      "Superseded 2026-05-30. Founding Glitch hoodie launches on Tier 1 personalize (unique QR per buyer). This legacy catalog id pointed at shared-batch Tier 0 inventory — not the launch checkout path.",
    product_class: "limited_drop",
    personalization_indicator: "Company drop",
    requires_card: false,
    supports_personalization: false,
    fulfillment_provider: "manual",
    print_template_id: null,
    price_display: "$98 + shipping",
    detail_path: storeProductDetailPath(TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID),
    cta_label: "View drop",
    status: "hidden",
    row_ids: [],
  },
];

const ROWS: StoreCatalogRow[] = [
  {
    row_id: "row_personalize",
    title: "Make it yours",
    subtitle: "Tier 1 belonging",
    story:
      "Preview your branded LIVE OBJECT QR on wearables. Founding Glitch drop plus generic hoodies and stickers — each physical unit gets a unique revocable code; you update what strangers see from your phone without reprinting.",
    product_ids: [
      GLITCH_HOODIE_STORE_PRODUCT_ID,
      HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID,
      STICKER_PERSONALIZED_STORE_PRODUCT_ID,
    ],
    sort_order: 1,
    status: "published",
  },
  {
    row_id: "row_founding",
    title: "Founding objects",
    subtitle: "Tier 0 curiosity",
    story:
      "Batch artifacts with a shared campaign QR — curiosity on the street. Founding sticker only at launch; Glitch hoodie is personalized wear in Make it yours.",
    product_ids: [TIER0_FOUNDING_STORE_PRODUCT_ID],
    sort_order: 2,
    status: "published",
  },
  {
    row_id: "row_wear",
    title: "Wear the signal",
    subtitle: null,
    story: "Apparel and wearable signals — curated for launch after Printify QA.",
    product_ids: [],
    sort_order: 10,
    status: "draft",
  },
  {
    row_id: "row_stick",
    title: "Stick & mark",
    subtitle: null,
    story: "Stickers, QR labels, and public markers.",
    product_ids: [],
    sort_order: 11,
    status: "draft",
  },
  {
    row_id: "row_carry",
    title: "Daily carry",
    subtitle: null,
    story: "Bags, cards, notebooks, and daily-carry items.",
    product_ids: [],
    sort_order: 12,
    status: "draft",
  },
  {
    row_id: "row_gather",
    title: "Gather",
    subtitle: null,
    story: "Event, meetup, table, and ceremony kits.",
    product_ids: [],
    sort_order: 13,
    status: "draft",
  },
  {
    row_id: "row_limited",
    title: "Limited drops",
    subtitle: null,
    story: "Numbered or time-limited editions.",
    product_ids: [],
    sort_order: 14,
    status: "draft",
  },
];

const DRAFT_ROW_IDS = ["row_wear", "row_stick", "row_carry", "row_gather", "row_limited"] as const;

const DRAFT_PRODUCT_CLASSES: StoreProductClass[] = ["general", "personalized", "general"];

function buildDraftProducts(): StoreCatalogProduct[] {
  const drafts: StoreCatalogProduct[] = [];
  let index = 1;
  for (const rowId of DRAFT_ROW_IDS) {
    for (let slot = 1; slot <= 9; slot += 1) {
      const productId = `draft_${rowId}_${slot}`;
      const personalized = slot % 3 === 0;
      drafts.push({
        product_id: productId,
        title: `Draft artifact ${index}`,
        meaning_line: "Placeholder product for catalog capacity — not sold yet.",
        story: "Reserved for a future story-row drop. Hidden from the public storefront.",
        product_class: DRAFT_PRODUCT_CLASSES[slot % DRAFT_PRODUCT_CLASSES.length]!,
        personalization_indicator: personalized ? "Personalized QR" : "General",
        requires_card: personalized,
        supports_personalization: personalized,
        fulfillment_provider: "printify",
        print_template_id: personalized ? DEFAULT_PRINT_TEMPLATE_ID : null,
        price_display: null,
        detail_path: `/shop/?draft=${productId}`,
        cta_label: "Coming soon",
        status: "draft",
        row_ids: [rowId],
      });
      index += 1;
    }
    const row = ROWS.find((entry) => entry.row_id === rowId);
    if (row) {
      row.product_ids = drafts
        .filter((product) => product.row_ids.includes(rowId))
        .map((product) => product.product_id);
    }
  }
  return drafts;
}

const DRAFT_PRODUCTS = buildDraftProducts();

const ALL_PRODUCTS: StoreCatalogProduct[] = [...LAUNCH_PRODUCTS, ...DRAFT_PRODUCTS];

const PRODUCT_BY_ID = new Map(ALL_PRODUCTS.map((product) => [product.product_id, product]));

export function getStoreCatalogProductCount(): number {
  return ALL_PRODUCTS.length;
}

export function getStoreProductById(productId: string): StoreCatalogProduct | null {
  const id = productId.trim();
  if (!id) return null;
  return PRODUCT_BY_ID.get(id) ?? null;
}

export interface StoreRowProductCard {
  product_id: string;
  title: string;
  meaning_line: string;
  price_display: string | null;
  product_class: StoreProductClass;
  personalization_indicator: StorePersonalizationIndicator;
  requires_card: boolean;
  availability: "preview" | "checkout" | "coming_soon";
  detail_path: string;
  action_path: string;
  cta_label: string;
}

export interface StoreRowResponse {
  row_id: string;
  title: string;
  subtitle: string | null;
  story: string;
  sort_order: number;
  products: StoreRowProductCard[];
}

export function toStoreRowProductCard(product: StoreCatalogProduct): StoreRowProductCard {
  return {
    product_id: product.product_id,
    title: product.title,
    meaning_line: product.meaning_line,
    price_display: product.price_display,
    product_class: product.product_class,
    personalization_indicator: product.personalization_indicator,
    requires_card: product.requires_card,
    availability: "coming_soon",
    detail_path: product.detail_path,
    action_path: storeProductActionPath(product),
    cta_label: product.cta_label,
  };
}

export function getPublishedStoreRows(): StoreRowResponse[] {
  const publishedRows = ROWS.filter((row) => row.status === "published").sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return publishedRows.map((row) => {
    const products = row.product_ids
      .map((productId) => PRODUCT_BY_ID.get(productId))
      .filter((product): product is StoreCatalogProduct => {
        return Boolean(product && product.status === "published");
      })
      .map((product) => toStoreRowProductCard(product));

    return {
      row_id: row.row_id,
      title: row.title,
      subtitle: row.subtitle,
      story: row.story,
      sort_order: row.sort_order,
      products,
    };
  });
}

export function toStoreProductDetail(product: StoreCatalogProduct) {
  return {
    product_id: product.product_id,
    title: product.title,
    story: product.story,
    meaning_line: product.meaning_line,
    product_class: product.product_class,
    personalization_indicator: product.personalization_indicator,
    requires_card: product.requires_card,
    supports_personalization: product.supports_personalization,
    fulfillment_provider: product.fulfillment_provider,
    print_template_id: product.print_template_id,
    price_display: product.price_display,
    detail_path: product.detail_path,
    action_path: storeProductActionPath(product),
    cta_label: product.cta_label,
    row_ids: product.row_ids,
    status: product.status,
  };
}
