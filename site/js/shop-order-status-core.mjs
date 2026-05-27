/**
 * Post-purchase order status — fetch + URL helpers (Phase 5).
 * See docs/MERCH_FUNNEL_MVP.md.
 */

export const SHOP_CHECKOUT_INTENT_SESSION_KEY = "hc_shop_checkout_intent_id";

/**
 * @param {string} origin
 * @param {{ artifact_intent_id?: string, shopify_order_id?: string, profile_id?: string }} query
 */
export async function fetchStoreOrderStatus(origin, query) {
  const base = typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
  if (!base) throw new Error("API origin unavailable.");

  const params = new URLSearchParams();
  if (query.artifact_intent_id) {
    params.set("artifact_intent_id", query.artifact_intent_id);
  } else if (query.shopify_order_id) {
    params.set("shopify_order_id", query.shopify_order_id);
    if (query.profile_id) params.set("profile_id", query.profile_id);
  } else {
    throw new Error("Missing order lookup reference.");
  }

  const res = await fetch(`${base}/v1/store/orders/status?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Could not load order status.";
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {URL | Location} [url]
 */
export function readOrderStatusQuery(url = globalThis.location) {
  try {
    const params = url instanceof URL ? url.searchParams : new URL(url.href).searchParams;
    const artifactIntentId = params.get("artifact_intent_id")?.trim() || "";
    const shopifyOrderId =
      params.get("shopify_order_id")?.trim() || params.get("order")?.trim() || "";
    const profileId = params.get("profile_id")?.trim() || "";
    if (artifactIntentId) {
      return { artifact_intent_id: artifactIntentId };
    }
    if (shopifyOrderId) {
      return profileId
        ? { shopify_order_id: shopifyOrderId, profile_id: profileId }
        : { shopify_order_id: shopifyOrderId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {string} intentId
 */
export function persistCheckoutIntentId(intentId) {
  if (typeof intentId !== "string" || !intentId.startsWith("ai_")) return;
  try {
    sessionStorage.setItem(SHOP_CHECKOUT_INTENT_SESSION_KEY, intentId.trim());
  } catch {
    /* ignore */
  }
}

export function peekCheckoutIntentId() {
  try {
    const raw = sessionStorage.getItem(SHOP_CHECKOUT_INTENT_SESSION_KEY);
    return typeof raw === "string" && raw.startsWith("ai_") ? raw.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} status
 */
export function orderStatusHeadline(status) {
  switch (status) {
    case "held_for_review":
      return "We are reviewing your order";
    case "canceled":
      return "Order canceled";
    case "refunded":
      return "Order refunded";
    case "processing":
      return "Order in progress";
    default:
      return "Order status";
  }
}
