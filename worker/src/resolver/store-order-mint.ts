import { lookupBuyerOrder, normalizeBuyerOrderRef } from "../commerce/buyer-order-lookup";
import { buildBuyerMintStatus } from "../commerce/buyer-order-mint";
import { mintPrintOrderFromCredentials } from "../commerce/fulfillment-mint";
import { pickDominantPrintOrder } from "../commerce/buyer-order-status";
import { normalizeBuyerEmail } from "../commerce/buyer-email-hash";
import { errorResponse, jsonResponse } from "../http/resolver";

interface StoreOrderMintRequest {
  order?: unknown;
  email?: unknown;
  qr_credentials?: unknown;
}

function credentialProfileId(credential: Record<string, unknown>): string | null {
  const profileId = credential.profile_id;
  return typeof profileId === "string" && profileId.trim() ? profileId.trim() : null;
}

/** POST /v1/store/order-mint — buyer signs planned print QRs after payment (email + order auth). */
export async function handlePostStoreOrderMint(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: StoreOrderMintRequest;
  try {
    body = (await request.json()) as StoreOrderMintRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const orderRef =
    typeof body.order === "string" ? normalizeBuyerOrderRef(body.order) : "";
  const email = typeof body.email === "string" ? normalizeBuyerEmail(body.email) : "";
  if (!orderRef) {
    return errorResponse("MISSING_ORDER", "Body field order is required.", 422);
  }
  if (!email) {
    return errorResponse("MISSING_EMAIL", "Body field email is required.", 422);
  }
  if (!Array.isArray(body.qr_credentials) || body.qr_credentials.length === 0) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include qr_credentials array.",
      400
    );
  }

  const lookup = await lookupBuyerOrder(db, orderRef, email);
  if (!lookup) {
    return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  const { commerce, printOrders } = lookup;
  const mintStatus = await buildBuyerMintStatus(db, commerce, printOrders);
  if (mintStatus.status === "not_applicable") {
    return errorResponse(
      "MINT_NOT_APPLICABLE",
      "This order does not require print QR activation.",
      409
    );
  }
  if (mintStatus.status === "complete") {
    return jsonResponse({
      mint_status: "complete",
      all_planned_minted: true,
      minted_count: 0,
      message: "Your print QR is already active.",
    });
  }

  const printOrder = pickDominantPrintOrder(printOrders);
  if (!printOrder) {
    return errorResponse(
      "PRINT_ORDER_NOT_READY",
      "Fulfillment is still queuing. Check back in a few minutes.",
      409
    );
  }

  if (!commerce.profile_id) {
    return errorResponse(
      "ORDER_PROFILE_MISSING",
      "Order is missing card linkage. Contact support with your order number.",
      422
    );
  }

  const credentials = body.qr_credentials.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );

  for (const credential of credentials) {
    const profileId = credentialProfileId(credential);
    if (profileId !== commerce.profile_id) {
      return errorResponse(
        "PROFILE_MISMATCH",
        "Signed credentials must match the card used at checkout.",
        422
      );
    }
  }

  const result = await mintPrintOrderFromCredentials(
    request,
    db,
    printOrder,
    credentials
  );

  if (!result.ok) {
    return errorResponse(result.code, result.message, result.httpStatus);
  }

  const status = result.all_planned_minted ? 200 : 422;
  return jsonResponse(
    {
      mint_status: result.all_planned_minted ? "complete" : "partial",
      all_planned_minted: result.all_planned_minted,
      minted_count: result.minted.length,
      failure_count: result.failures.length,
      message: result.all_planned_minted
        ? "Your print QR is active. Production can continue."
        : "Some credentials could not be activated. Try again or contact support.",
      failures: result.failures.map((failure) => ({
        code: failure.code,
        message: failure.message,
      })),
    },
    status
  );
}
