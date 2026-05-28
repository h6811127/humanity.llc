import { hashBuyerEmail, normalizeBuyerEmail } from "../commerce/buyer-email-hash";
import { buildBuyerOrderStatus } from "../commerce/buyer-order-status";
import { getCommerceOrderForBuyerLookup } from "../db/commerce-orders";
import { getPrintOrdersByCommerceOrderId } from "../db/print-orders";
import { errorResponse, jsonResponse } from "../http/resolver";

function normalizeOrderRef(raw: string): string {
  return raw.trim().replace(/^#+/, "");
}

/** GET /v1/store/order-status — buyer-safe fulfillment status (email + order number). */
export async function handleGetStoreOrderStatus(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const orderRef = normalizeOrderRef(url.searchParams.get("order") ?? "");
  const emailRaw = url.searchParams.get("email") ?? "";

  if (!orderRef) {
    return errorResponse("MISSING_ORDER", "Query parameter order is required.", 422);
  }

  const email = normalizeBuyerEmail(emailRaw);
  if (!email) {
    return errorResponse("MISSING_EMAIL", "Query parameter email is required.", 422);
  }

  const emailHash = await hashBuyerEmail(email);
  const commerce = await getCommerceOrderForBuyerLookup(db, orderRef);
  if (!commerce || commerce.buyer_email_hash !== emailHash) {
    return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  const printOrders = await getPrintOrdersByCommerceOrderId(db, commerce.commerce_order_id);
  return jsonResponse(buildBuyerOrderStatus(commerce, printOrders));
}
