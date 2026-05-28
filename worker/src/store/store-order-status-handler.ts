import { PROFILE_ID_REGEX } from "../crypto";
import { errorResponse, jsonResponse } from "../http/resolver";
import {
  isValidArtifactIntentLookupId,
  isValidShopifyOrderLookupId,
  lookupStoreOrderStatusByArtifactIntent,
  lookupStoreOrderStatusByShopifyOrderAndProfile,
  lookupStoreOrderStatusByShopifyOrderId,
} from "./store-order-status";

/** GET /v1/store/orders/status — shopper order timeline (no auth; secret link or order #). */
export async function handleGetStoreOrderStatus(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const artifactIntentId = url.searchParams.get("artifact_intent_id")?.trim() ?? "";
  const shopifyOrderId = url.searchParams.get("shopify_order_id")?.trim() ?? "";
  const profileId = url.searchParams.get("profile_id")?.trim() ?? "";

  if (artifactIntentId) {
    if (shopifyOrderId || profileId) {
      return errorResponse(
        "INVALID_LOOKUP_QUERY",
        "Use artifact_intent_id alone, or shopify_order_id with optional profile_id.",
        422
      );
    }
    if (!isValidArtifactIntentLookupId(artifactIntentId)) {
      return errorResponse("INVALID_ARTIFACT_INTENT_ID", "Invalid artifact_intent_id.", 422);
    }
    const status = await lookupStoreOrderStatusByArtifactIntent(db, artifactIntentId);
    if (!status) {
      return errorResponse("ORDER_NOT_FOUND", "No order found for that reference.", 404);
    }
    return jsonResponse(status);
  }

  if (shopifyOrderId) {
    if (!isValidShopifyOrderLookupId(shopifyOrderId)) {
      return errorResponse("INVALID_SHOPIFY_ORDER_ID", "Invalid shopify_order_id.", 422);
    }
    if (profileId) {
      if (!PROFILE_ID_REGEX.test(profileId)) {
        return errorResponse("INVALID_PROFILE_ID", "Invalid profile_id.", 422);
      }
      const status = await lookupStoreOrderStatusByShopifyOrderAndProfile(
        db,
        shopifyOrderId,
        profileId
      );
      if (!status) {
        return errorResponse("ORDER_NOT_FOUND", "No order found for that reference.", 404);
      }
      return jsonResponse(status);
    }

    const status = await lookupStoreOrderStatusByShopifyOrderId(db, shopifyOrderId);
    if (!status) {
      return errorResponse("ORDER_NOT_FOUND", "No order found for that reference.", 404);
    }
    return jsonResponse(status);
  }

  return errorResponse(
    "INVALID_LOOKUP_QUERY",
    "Provide artifact_intent_id or shopify_order_id (optional profile_id for personalized orders).",
    422
  );
}
