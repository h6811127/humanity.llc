/** Humanity-approved print templates (not raw Printify catalog). O-002 */

export interface PrintCatalogVariant {
  variant_id: string;
  label: string;
  enabled: boolean;
}

export interface PrintCatalogProduct {
  template_id: string;
  type: "sticker" | "card" | "hoodie";
  title: string;
  description: string;
  product_id: string;
  /** When false, excluded from Tier 1 customizer (e.g. Tier 0 batch). */
  personalizable?: boolean;
  variants: PrintCatalogVariant[];
}

export const DEFAULT_PRINT_TEMPLATE_ID = "hc-sticker-square-v1";

/** Tier 0 founding sticker — shared batch QR artwork; no per-item mint. */
export const TIER0_BATCH_PRINT_TEMPLATE_ID = "hc-tier0-sticker-batch-v1";

/** Tier 1 Live Object hoodie — unique QR per physical unit (Printify QA gated). */
export const HOODIE_LIVE_OBJECT_TEMPLATE_ID = "hc-hoodie-live-object-v1";

/** Storefront product ids (shop-config / artifact intent). */
export const STICKER_PERSONALIZED_STORE_PRODUCT_ID = "sticker_personalized_v1";
export const HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID = "hoodie_live_object_v1";

const STORE_PRODUCT_TEMPLATE: Record<string, string> = {
  [STICKER_PERSONALIZED_STORE_PRODUCT_ID]: DEFAULT_PRINT_TEMPLATE_ID,
  [HOODIE_LIVE_OBJECT_STORE_PRODUCT_ID]: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  prod_sticker_square: DEFAULT_PRINT_TEMPLATE_ID,
  prod_hoodie_live_object: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
};

const CATALOG: PrintCatalogProduct[] = [
  {
    template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Founding signal sticker (Tier 0 batch)",
    description:
      "Mass founding sticker with shared campaign QR — no per-order personalization.",
    product_id: "prod_tier0_sticker_batch",
    personalizable: false,
    variants: [
      {
        variant_id: "tier0-batch",
        label: "Tier 0 batch / shared QR",
        enabled: true,
      },
    ],
  },
  {
    template_id: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
    type: "hoodie",
    title: "Live Object hoodie",
    description:
      "Front-chest LIVE OBJECT QR — unique revocable code per physical unit.",
    product_id: "prod_hoodie_live_object",
    variants: [
      {
        variant_id: "black-m",
        label: "Black / M",
        enabled: true,
      },
      {
        variant_id: "black-l",
        label: "Black / L",
        enabled: true,
      },
    ],
  },
  {
    template_id: DEFAULT_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Humanity QR Sticker",
    description: "Square sticker with signed Humanity QR (2×2 in trim + bleed).",
    product_id: "prod_sticker_square",
    variants: [
      {
        variant_id: "2x2-white",
        label: "2 × 2 in / White",
        enabled: true,
      },
    ],
  },
];

export function getApprovedPrintCatalog(): PrintCatalogProduct[] {
  return CATALOG.map((product) => ({
    ...product,
    variants: product.variants.filter((v) => v.enabled),
  }));
}

/** Tier 1 customizer — excludes batch Tier 0 templates. */
export function getPersonalizablePrintCatalog(): PrintCatalogProduct[] {
  return getApprovedPrintCatalog().filter(
    (product) =>
      product.personalizable !== false &&
      product.template_id !== TIER0_BATCH_PRINT_TEMPLATE_ID
  );
}

export function getPrintCatalogProduct(templateId: string): PrintCatalogProduct | null {
  return getApprovedPrintCatalog().find((p) => p.template_id === templateId) ?? null;
}

/** Resolve print template from storefront product_id on artifact intents. */
export function isKnownStoreProductId(productId: string | null): boolean {
  if (!productId?.trim()) return false;
  const id = productId.trim();
  if (STORE_PRODUCT_TEMPLATE[id]) return true;
  return getApprovedPrintCatalog().some((p) => p.product_id === id);
}

/** Resolve print template from storefront product_id on artifact intents. */
export function resolvePrintTemplateForStoreProductId(productId: string | null): string {
  if (!productId?.trim()) return DEFAULT_PRINT_TEMPLATE_ID;
  const mapped = STORE_PRODUCT_TEMPLATE[productId.trim()];
  if (mapped) return mapped;
  const byCatalog = getApprovedPrintCatalog().find((p) => p.product_id === productId.trim());
  return byCatalog?.template_id ?? DEFAULT_PRINT_TEMPLATE_ID;
}
