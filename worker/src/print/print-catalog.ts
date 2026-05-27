/** Humanity-approved print templates (not raw Printify catalog). O-002 */

export interface PrintCatalogVariant {
  variant_id: string;
  label: string;
  enabled: boolean;
}

export interface PrintCatalogProduct {
  template_id: string;
  type: "sticker" | "card" | "apparel";
  title: string;
  description: string;
  product_id: string;
  variants: PrintCatalogVariant[];
}

export const DEFAULT_PRINT_TEMPLATE_ID = "hc-sticker-square-v1";

/** Tier 1 personalized hoodie — LIVE OBJECT branded QR on chest print area. */
export const HOODIE_PRINT_TEMPLATE_ID = "hc-hoodie-live-object-v1";

/** shop-config.json personalize.products[].product_id values (Tier 1). */
export const HOODIE_LIVE_OBJECT_PRODUCT_ID = "hoodie_live_object_v1";
export const STICKER_PERSONALIZED_PRODUCT_ID = "sticker_personalized_v1";

/** Tier 0 founding sticker — shared batch QR artwork; no per-item mint. */
export const TIER0_BATCH_PRINT_TEMPLATE_ID = "hc-tier0-sticker-batch-v1";

const CATALOG: PrintCatalogProduct[] = [
  {
    template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Founding signal sticker (Tier 0 batch)",
    description:
      "Mass founding sticker with shared campaign QR — no per-order personalization.",
    product_id: "prod_tier0_sticker_batch",
    variants: [
      {
        variant_id: "tier0-batch",
        label: "Tier 0 batch / shared QR",
        enabled: true,
      },
    ],
  },
  {
    template_id: DEFAULT_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Humanity QR Sticker",
    description: "Square sticker with signed Humanity QR (2×2 in trim + bleed).",
    product_id: STICKER_PERSONALIZED_PRODUCT_ID,
    variants: [
      {
        variant_id: "2x2-white",
        label: "2 × 2 in / White",
        enabled: true,
      },
    ],
  },
  {
    template_id: HOODIE_PRINT_TEMPLATE_ID,
    type: "apparel",
    title: "Live Object hoodie",
    description: "Hoodie with LIVE OBJECT branded QR on chest print area.",
    product_id: HOODIE_LIVE_OBJECT_PRODUCT_ID,
    variants: [
      {
        variant_id: "hoodie-default",
        label: "Default / unisex",
        enabled: true,
      },
    ],
  },
];

/** Map artifact-intent product_id to approved print template (Tier 1). */
export function resolvePrintTemplateIdForProduct(productId: string | null): string {
  if (productId === HOODIE_LIVE_OBJECT_PRODUCT_ID) return HOODIE_PRINT_TEMPLATE_ID;
  return DEFAULT_PRINT_TEMPLATE_ID;
}

export function getApprovedPrintCatalog(): PrintCatalogProduct[] {
  return CATALOG.map((product) => ({
    ...product,
    variants: product.variants.filter((v) => v.enabled),
  }));
}

export function getPrintCatalogProduct(templateId: string): PrintCatalogProduct | null {
  return getApprovedPrintCatalog().find((p) => p.template_id === templateId) ?? null;
}
