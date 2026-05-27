/** Parse artifact intent refs from Shopify order JSON (line properties + note attributes). */

export interface ShopifyNameValue {
  name: string;
  value: string;
}

export interface ShopifyLineItem {
  quantity?: number;
  variant_id?: number | string;
  sku?: string;
  properties?: ShopifyNameValue[];
}

export interface ShopifyOrderLike {
  id?: number | string;
  checkout_id?: number | string | null;
  checkout_token?: string | null;
  financial_status?: string | null;
  email?: string | null;
  order_number?: number | null;
  name?: string | null;
  line_items?: ShopifyLineItem[];
  note_attributes?: ShopifyNameValue[];
}

export interface ExtractedShopifyOrderMetadata {
  shopify_order_id: string;
  shopify_checkout_id: string | null;
  shopify_order_number: number | null;
  buyer_email: string | null;
  profile_id: string | null;
  artifact_intent_ids: string[];
}

function lineItemVariantId(item: ShopifyLineItem): string | null {
  if (typeof item.variant_id === "number" && Number.isFinite(item.variant_id)) {
    return String(item.variant_id);
  }
  if (typeof item.variant_id === "string" && item.variant_id.trim()) {
    return item.variant_id.trim();
  }
  return null;
}

export function countTier0LineQuantity(
  order: ShopifyOrderLike,
  variantIds: Set<string>
): number {
  let quantity = 0;
  for (const item of order.line_items ?? []) {
    const variantId = lineItemVariantId(item);
    if (!variantId || !variantIds.has(variantId)) continue;
    const qty =
      typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
        ? item.quantity
        : 1;
    quantity += qty;
  }
  return quantity;
}

function readAttributes(pairs: ShopifyNameValue[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!pairs) return map;
  for (const pair of pairs) {
    if (typeof pair.name !== "string" || typeof pair.value !== "string") continue;
    const name = pair.name.trim();
    const value = pair.value.trim();
    if (!name || !value) continue;
    map.set(name, value);
  }
  return map;
}

function collectIntentIds(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    for (const part of raw.split(",")) {
      const id = part.trim();
      if (!id.startsWith("ai_") || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function shopifyOrderIsPaid(order: ShopifyOrderLike): boolean {
  const status = order.financial_status?.trim().toLowerCase() ?? "";
  return status === "paid" || status === "partially_paid";
}

export function shopifyOrderIdString(order: ShopifyOrderLike): string | null {
  if (typeof order.id === "number" && Number.isFinite(order.id)) {
    return String(order.id);
  }
  if (typeof order.id === "string" && order.id.trim()) {
    return order.id.trim();
  }
  return null;
}

export function extractShopifyOrderMetadata(
  order: ShopifyOrderLike
): ExtractedShopifyOrderMetadata | null {
  const shopifyOrderId = shopifyOrderIdString(order);
  if (!shopifyOrderId) return null;

  let checkoutId: string | null = null;
  if (typeof order.checkout_id === "number" && Number.isFinite(order.checkout_id)) {
    checkoutId = String(order.checkout_id);
  } else if (typeof order.checkout_id === "string" && order.checkout_id.trim()) {
    checkoutId = order.checkout_id.trim();
  } else if (typeof order.checkout_token === "string" && order.checkout_token.trim()) {
    checkoutId = order.checkout_token.trim();
  }

  const noteAttrs = readAttributes(order.note_attributes);
  const intentIdSources: string[] = [];
  if (noteAttrs.has("artifact_intent_id")) {
    intentIdSources.push(noteAttrs.get("artifact_intent_id")!);
  }

  let profileId = noteAttrs.get("profile_id") ?? null;

  for (const item of order.line_items ?? []) {
    const props = readAttributes(item.properties);
    if (props.has("artifact_intent_id")) {
      intentIdSources.push(props.get("artifact_intent_id")!);
    }
    if (!profileId && props.has("profile_id")) {
      profileId = props.get("profile_id")!;
    }
  }

  return {
    shopify_order_id: shopifyOrderId,
    shopify_checkout_id: checkoutId,
    shopify_order_number: parseShopifyOrderNumber(order),
    buyer_email:
      typeof order.email === "string" && order.email.trim()
        ? order.email.trim().toLowerCase()
        : null,
    profile_id: profileId,
    artifact_intent_ids: collectIntentIds(intentIdSources),
  };
}

function parseShopifyOrderNumber(order: ShopifyOrderLike): number | null {
  if (typeof order.order_number === "number" && Number.isFinite(order.order_number)) {
    return order.order_number;
  }
  if (typeof order.name === "string") {
    const digits = order.name.trim().replace(/^#+/, "");
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
