import {
  allPlannedQrsMinted,
  mintPrintOrderFromCredentials,
} from "../commerce/fulfillment-mint";
import { ensurePrintOrderForCommerceOrder } from "../commerce/fulfillment-queue";
import {
  getCommerceOrderById,
  type CommerceOrderRow,
} from "../db/commerce-orders";
import {
  getPrintOrderById,
  updatePrintOrderStatus,
  type PrintOrderRow,
} from "../db/print-orders";
import { operatorAuditAuthorized } from "../http/operator-auth";
import { errorResponse, jsonResponse } from "../http/resolver";
import type { Env } from "../env";
import { submitPrintifyOrder } from "./printify-client";
import { parsePrintifyShippingAddress } from "./printify-shipping";

interface CreatePrintOrderRequest {
  commerce_order_id?: unknown;
  submit_to_printify?: unknown;
  shipping_address?: unknown;
  quantity?: unknown;
}

interface MintPrintOrderRequest {
  qr_credentials?: unknown;
}

function printOrderResponse(row: PrintOrderRow) {
  return {
    order_id: row.order_id,
    profile_id: row.profile_id,
    print_artifact_ids: JSON.parse(row.print_artifact_ids_json) as string[],
    planned_item_qr_ids: JSON.parse(row.planned_item_qr_ids_json) as string[],
    commerce_order_id: row.commerce_order_id,
    shopify_order_id: row.shopify_order_id,
    printify_order_id: row.printify_order_id,
    printify_shop_id: row.printify_shop_id,
    template_id: row.template_id,
    status: row.status,
    shipping_method: row.shipping_method,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function requireOperator(request: Request, env: Env): Response | null {
  if (!operatorAuditAuthorized(request, env.OPERATOR_AUDIT_TOKEN)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
      401
    );
  }
  return null;
}

/** POST /v1/print/orders — internal operator queue + optional Printify submit. */
export async function handlePostPrintOrders(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const authErr = requireOperator(request, env);
  if (authErr) return authErr;

  let body: CreatePrintOrderRequest;
  try {
    body = (await request.json()) as CreatePrintOrderRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const commerceOrderId =
    typeof body.commerce_order_id === "string" ? body.commerce_order_id.trim() : "";
  if (!commerceOrderId.startsWith("co_")) {
    return errorResponse("INVALID_COMMERCE_ORDER_ID", "Invalid commerce_order_id.", 422);
  }

  const commerceOrder = await getCommerceOrderById(db, commerceOrderId);
  if (!commerceOrder) {
    return errorResponse("COMMERCE_ORDER_NOT_FOUND", "Commerce order not found.", 404);
  }

  const nowIso = new Date().toISOString();
  const queued = await ensurePrintOrderForCommerceOrder(db, commerceOrder, nowIso);
  if (!queued) {
    return errorResponse(
      "PRINT_ORDER_NOT_QUEUEABLE",
      "Commerce order is not eligible for print fulfillment.",
      409
    );
  }

  let printOrder = queued.print_order;

  if (body.submit_to_printify === true) {
    if (printOrder.status !== "awaiting_production_approval") {
      return jsonResponse(printOrderResponse(printOrder), 200);
    }

    const minted = await allPlannedQrsMinted(db, printOrder);
    if (!minted) {
      return errorResponse(
        "PLANNED_QRS_NOT_MINTED",
        "All planned print_artifact QRs must be minted before Printify submit.",
        409
      );
    }

    const shippingAddress = parsePrintifyShippingAddress(body.shipping_address);
    if (!shippingAddress) {
      return errorResponse(
        "PRINTIFY_SHIPPING_REQUIRED",
        "submit_to_printify requires a valid shipping_address object (not stored in D1).",
        422
      );
    }

    let quantity = 1;
    if (body.quantity !== undefined && body.quantity !== null) {
      if (typeof body.quantity !== "number" || !Number.isInteger(body.quantity) || body.quantity < 1) {
        return errorResponse("INVALID_QUANTITY", "quantity must be a positive integer.", 422);
      }
      quantity = body.quantity;
    }

    const submit = await submitPrintifyOrder(env, {
      print_order_id: printOrder.order_id,
      template_id: printOrder.template_id,
      planned_item_qr_ids: JSON.parse(printOrder.planned_item_qr_ids_json) as string[],
      shipping_address: shippingAddress,
      quantity,
    });

    if (!submit.ok) {
      const status =
        submit.code === "PRINTIFY_RATE_LIMITED"
          ? 429
          : submit.code === "PRINTIFY_INVALID_ADDRESS" ||
              submit.code === "PRINTIFY_TEMPLATE_UNCONFIGURED"
            ? 422
            : submit.code === "PRINTIFY_SUBMIT_DEFERRED" ||
                submit.code === "PRINTIFY_UNCONFIGURED"
              ? 503
              : 502;
      return errorResponse(submit.code, submit.message, status);
    }

    await updatePrintOrderStatus(
      db,
      printOrder.order_id,
      "submitted",
      nowIso,
      submit.printify_order_id,
      submit.printify_shop_id
    );
    printOrder = {
      ...printOrder,
      status: "submitted",
      printify_order_id: submit.printify_order_id,
      printify_shop_id: submit.printify_shop_id,
      updated_at: nowIso,
    };
  }

  return jsonResponse(
    {
      ...printOrderResponse(printOrder),
      created: queued.created,
    },
    queued.created ? 201 : 200
  );
}

/** GET /v1/print/orders/{order_id} — operator timeline lookup. */
export async function handleGetPrintOrder(
  request: Request,
  env: Env,
  db: D1Database,
  orderId: string
): Promise<Response> {
  const authErr = requireOperator(request, env);
  if (authErr) return authErr;

  const row = await getPrintOrderById(db, orderId);
  if (!row) {
    return errorResponse("PRINT_ORDER_NOT_FOUND", "Print order not found.", 404);
  }

  return jsonResponse(printOrderResponse(row));
}

/** POST /v1/print/orders/{order_id}/mint — batch mint planned owner-signed QRs. */
export async function handlePostPrintOrderMint(
  request: Request,
  env: Env,
  db: D1Database,
  orderId: string
): Promise<Response> {
  const authErr = requireOperator(request, env);
  if (authErr) return authErr;

  let body: MintPrintOrderRequest;
  try {
    body = (await request.json()) as MintPrintOrderRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  if (!Array.isArray(body.qr_credentials) || body.qr_credentials.length === 0) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include qr_credentials array.",
      400
    );
  }

  const printOrder = await getPrintOrderById(db, orderId);
  if (!printOrder) {
    return errorResponse("PRINT_ORDER_NOT_FOUND", "Print order not found.", 404);
  }

  if (printOrder.status === "canceled" || printOrder.status === "unfulfillable") {
    return errorResponse(
      "PRINT_ORDER_NOT_MINTABLE",
      "Print order cannot accept fulfillment mint.",
      409
    );
  }

  const credentials = body.qr_credentials.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );

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
      order_id: printOrder.order_id,
      minted: result.minted.map((m) => ({
        qr_id: m.qr_id,
        print_artifact_id: m.print_artifact_id,
        scan_url: m.scan_url,
        already_minted: m.already_minted,
      })),
      failures: result.failures,
      all_planned_minted: result.all_planned_minted,
    },
    status
  );
}

export async function queuePrintOrderAfterPaidWebhook(
  db: D1Database,
  commerceOrder: CommerceOrderRow,
  nowIso: string
): Promise<string[]> {
  const queued = await ensurePrintOrderForCommerceOrder(db, commerceOrder, nowIso);
  if (!queued) return JSON.parse(commerceOrder.print_order_ids_json) as string[];
  return [queued.print_order.order_id];
}
