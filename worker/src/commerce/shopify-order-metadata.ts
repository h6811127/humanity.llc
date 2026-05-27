/** Parse artifact intent refs from Shopify order JSON (line properties + note attributes). */

export interface ShopifyNameValue {
  name: string;
  value: string;
}

export interface ShopifyLineItem {
  quantity?: number;
  properties?: ShopifyNameValue[];
}

export interface ShopifyOrderLike {
  id?: number | string;
  checkout_id?: number | string | null;
  checkout_token?: string | null;
  financial_status?: string | null;
  line_items?: ShopifyLineItem[];
  note_attributes?: ShopifyNameValue[];
}

export interface ExtractedShopifyOrderMetadata {
  shopify_order_id: string;
  shopify_checkout_id: string | null;
  profile_id: string | null;
  artifact_intent_ids: string[];
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
    profile_id: profileId,
    artifact_intent_ids: collectIntentIds(intentIdSources),
  };
}
