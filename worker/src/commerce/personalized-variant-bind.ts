/**
 * Bind paid Shopify variant ids to artifact-intent print specs.
 * Printify uses intent.print_variant_id; Shopify charges the line variant_id.
 */

import type { ArtifactIntentRow } from "../db/artifact-intents";
import {
  lineItemHasArtifactIntent,
  lineItemVariantId,
  type ShopifyOrderLike,
} from "./shopify-order-metadata";

export interface PersonalizedShopifyVariantBinding {
  product_id: string;
  print_variant_id: string;
  shopify_variant_id: string;
}

export const ARTIFACT_INTENT_VARIANT_MISMATCH = "ARTIFACT_INTENT_VARIANT_MISMATCH";

/** Wired Glitch hoodie SKUs from site/data/shop-config.json (personalize.products). */
export const PERSONALIZED_SHOPIFY_VARIANT_BINDINGS: readonly PersonalizedShopifyVariantBinding[] = [
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-s", shopify_variant_id: "52946880135477" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-m", shopify_variant_id: "52946880332085" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-l", shopify_variant_id: "52946880528693" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-xl", shopify_variant_id: "52946880725301" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-2xl", shopify_variant_id: "52946880921909" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "black-3xl", shopify_variant_id: "52946881118517" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-s", shopify_variant_id: "52946880168245" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-m", shopify_variant_id: "52946880364853" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-l", shopify_variant_id: "52946880561461" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-xl", shopify_variant_id: "52946880758069" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-2xl", shopify_variant_id: "52946880954677" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "charcoal-heather-3xl", shopify_variant_id: "52946881151285" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-s", shopify_variant_id: "52946880233781" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-m", shopify_variant_id: "52946880430389" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-l", shopify_variant_id: "52946880626997" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-xl", shopify_variant_id: "52946880823605" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-2xl", shopify_variant_id: "52946881020213" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "light-steel-3xl", shopify_variant_id: "52946881216821" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-s", shopify_variant_id: "52946880266549" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-m", shopify_variant_id: "52946880463157" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-l", shopify_variant_id: "52946880659765" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-xl", shopify_variant_id: "52946880856373" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-2xl", shopify_variant_id: "52946881052981" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "navy-3xl", shopify_variant_id: "52946881249589" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-s", shopify_variant_id: "52946880201013" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-m", shopify_variant_id: "52946880397621" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-l", shopify_variant_id: "52946880594229" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-xl", shopify_variant_id: "52946880790837" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-2xl", shopify_variant_id: "52946880987445" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "stone-grey-3xl", shopify_variant_id: "52946881184053" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-s", shopify_variant_id: "52946880299317" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-m", shopify_variant_id: "52946880495925" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-l", shopify_variant_id: "52946880692533" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-xl", shopify_variant_id: "52946880889141" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-2xl", shopify_variant_id: "52946881085749" },
  { product_id: "glitch_hoodie_v1", print_variant_id: "white-3xl", shopify_variant_id: "52946881282357" },
];

export function personalizedShopifyVariantsFromShopConfig(
  config: unknown
): PersonalizedShopifyVariantBinding[] {
  if (!config || typeof config !== "object") return [];
  const personalize = (config as { personalize?: unknown }).personalize;
  if (!personalize || typeof personalize !== "object") return [];
  const products = (personalize as { products?: unknown }).products;
  if (!Array.isArray(products)) return [];

  const out: PersonalizedShopifyVariantBinding[] = [];
  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    const productId =
      typeof (product as { product_id?: unknown }).product_id === "string"
        ? (product as { product_id: string }).product_id.trim()
        : "";
    if (!productId) continue;
    const variants = (product as { variants?: unknown }).variants;
    if (!Array.isArray(variants)) continue;
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue;
      const printVariantId =
        typeof (variant as { print_variant_id?: unknown }).print_variant_id === "string"
          ? (variant as { print_variant_id: string }).print_variant_id.trim()
          : "";
      const shopifyVariantId =
        typeof (variant as { shopify_variant_id?: unknown }).shopify_variant_id === "string"
          ? (variant as { shopify_variant_id: string }).shopify_variant_id.trim()
          : "";
      if (!printVariantId || !shopifyVariantId) continue;
      out.push({
        product_id: productId,
        print_variant_id: printVariantId,
        shopify_variant_id: shopifyVariantId,
      });
    }
  }
  return out;
}

export function lookupPersonalizedShopifyVariant(
  shopifyVariantId: string,
  catalog: readonly PersonalizedShopifyVariantBinding[] = PERSONALIZED_SHOPIFY_VARIANT_BINDINGS
): PersonalizedShopifyVariantBinding | null {
  const id = shopifyVariantId.trim();
  if (!id) return null;
  return catalog.find((row) => row.shopify_variant_id === id) ?? null;
}

export function collectPaidShopifyVariantIdsForIntent(
  order: ShopifyOrderLike,
  artifactIntentId: string
): string[] {
  const lines = order.line_items ?? [];
  const tagged = lines.filter((item) => lineItemHasArtifactIntent(item, artifactIntentId));
  const source = tagged.length > 0 ? tagged : lines;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    const variantId = lineItemVariantId(item);
    if (!variantId || seen.has(variantId)) continue;
    seen.add(variantId);
    ids.push(variantId);
  }
  return ids;
}

/**
 * When the intent names a print variant that is wired to Shopify, paid line
 * variant_ids must resolve to that same print spec. Lines without variant_id
 * are ignored (legacy fixtures / incomplete payloads).
 */
export function validateIntentPaidShopifyVariants(
  intent: Pick<ArtifactIntentRow, "product_id" | "print_variant_id">,
  order: ShopifyOrderLike,
  artifactIntentId: string,
  catalog: readonly PersonalizedShopifyVariantBinding[] = PERSONALIZED_SHOPIFY_VARIANT_BINDINGS
): { ok: true } | { ok: false; hold_reason: string } {
  const printVariantId = intent.print_variant_id?.trim() || "";
  if (!printVariantId) return { ok: true };

  const paidVariantIds = collectPaidShopifyVariantIdsForIntent(order, artifactIntentId);
  if (paidVariantIds.length === 0) return { ok: true };

  const expectedProductId = intent.product_id?.trim() || "";

  for (const shopifyVariantId of paidVariantIds) {
    const binding = lookupPersonalizedShopifyVariant(shopifyVariantId, catalog);
    if (!binding) {
      return { ok: false, hold_reason: ARTIFACT_INTENT_VARIANT_MISMATCH };
    }
    if (binding.print_variant_id !== printVariantId) {
      return { ok: false, hold_reason: ARTIFACT_INTENT_VARIANT_MISMATCH };
    }
    if (expectedProductId && binding.product_id !== expectedProductId) {
      return { ok: false, hold_reason: ARTIFACT_INTENT_VARIANT_MISMATCH };
    }
  }

  return { ok: true };
}
