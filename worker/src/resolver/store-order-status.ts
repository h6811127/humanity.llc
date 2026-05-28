import { lookupBuyerOrder, normalizeBuyerOrderRef } from "../commerce/buyer-order-lookup";
import { buildBuyerMintStatus } from "../commerce/buyer-order-mint";
import { buildBuyerOrderStatus } from "../commerce/buyer-order-status";
import { normalizeBuyerEmail } from "../commerce/buyer-email-hash";
import { errorResponse, jsonResponse } from "../http/resolver";

/** GET /v1/store/order-status — buyer-safe fulfillment status (email + order number). */
export async function handleGetStoreOrderStatus(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const orderRef = normalizeBuyerOrderRef(url.searchParams.get("order") ?? "");
  const emailRaw = url.searchParams.get("email") ?? "";

  if (!orderRef) {
    return errorResponse("MISSING_ORDER", "Query parameter order is required.", 422);
  }

  const email = normalizeBuyerEmail(emailRaw);
  if (!email) {
    return errorResponse("MISSING_EMAIL", "Query parameter email is required.", 422);
  }

  const lookup = await lookupBuyerOrder(db, orderRef, email);
  if (!lookup) {
    return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  const { commerce, printOrders } = lookup;
  const mint = await buildBuyerMintStatus(db, commerce, printOrders);
  return jsonResponse({
    ...buildBuyerOrderStatus(commerce, printOrders),
    mint,
  });
}
