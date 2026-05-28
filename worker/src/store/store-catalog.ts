/**
 * Story-row storefront seed — SF-001 skeleton.
 * Represents ~50 product records; launch exposes only published rows/products.
 * See docs/features/Storefront v1.0.md § 11.
 */

import {
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
    meaning_line: "Front-chest LIVE OBJECT QR — unique per physical unit.",
    story:
      "Tier 1 apparel — preview your branded QR on a hoodie mockup. Each unit gets its own revocable print artifact.",
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
];

const ROWS: StoreCatalogRow[] = [
  {
    row_id: "row_personalize",
    title: "Make it yours",
    subtitle: "Tier 1 belonging",
    story:
      "Preview your branded LIVE OBJECT QR on wearables. Each physical unit gets a unique revocable code; you update what strangers see from your phone without reprinting.",
    product_ids: [HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID, STICKER_PERSONALIZED_STORE_PRODUCT_ID],
    sort_order: 1,
    status: "published",
  },
  {
    row_id: "row_founding",
    title: "Founding objects",
    subtitle: "Tier 0 curiosity",
    story:
      "Batch artifacts with a shared campaign QR. A pointer to the experiment, not a passport. Separate from personalized wear; same honesty about limits.",
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
