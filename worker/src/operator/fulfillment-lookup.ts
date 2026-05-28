/**
 * O-003 operator fulfillment lookup — chain Shopify → commerce → intent → print order.
 * No shipping PII; resolver trust tables only.
 */
import { getPlannedMintStatus } from "../commerce/fulfillment-mint";
import { getArtifactIntent, type ArtifactIntentRow } from "../db/artifact-intents";
import {
  findCommerceOrdersByArtifactIntentId,
  getCommerceOrderById,
  getCommerceOrderByShopifyId,
  type CommerceOrderRow,
} from "../db/commerce-orders";
import {
  getPrintOrderByCommerceOrderId,
  getPrintOrderById,
  getPrintOrderByPrintifyOrderId,
  type PrintOrderRow,
} from "../db/print-orders";
import { operatorAuditAuthorized } from "../http/operator-auth";
import { errorResponse, jsonResponse } from "../http/resolver";
import type { Env } from "../env";

export interface FulfillmentLookupQuery {
  shopify_order_id?: string;
  commerce_order_id?: string;
  artifact_intent_id?: string;
  print_order_id?: string;
  printify_order_id?: string;
}

function artifactIntentResponse(row: ArtifactIntentRow) {
  return {
    artifact_intent_id: row.artifact_intent_id,
    profile_id: row.profile_id,
    source_qr_id: row.source_qr_id,
    product_id: row.product_id,
    quantity: row.quantity,
    planned_item_qr_ids: JSON.parse(row.planned_item_qr_ids_json) as string[],
    planned_print_artifact_ids: JSON.parse(row.planned_print_artifact_ids_json) as string[],
    status: row.status,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function commerceOrderResponse(row: CommerceOrderRow) {
  return {
    commerce_order_id: row.commerce_order_id,
    shopify_order_id: row.shopify_order_id,
    shopify_checkout_id: row.shopify_checkout_id,
    profile_id: row.profile_id,
    artifact_intent_ids: JSON.parse(row.artifact_intent_ids_json) as string[],
    print_order_ids: JSON.parse(row.print_order_ids_json) as string[],
    status: row.status,
    hold_reason: row.hold_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function printOrderWithMint(db: D1Database, row: PrintOrderRow) {
  const mintStatus = await getPlannedMintStatus(db, row);
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
    mint_status: mintStatus,
  };
}

function parseLookupQuery(url: URL): FulfillmentLookupQuery | null {
  const shopifyOrderId = url.searchParams.get("shopify_order_id")?.trim() ?? "";
  const commerceOrderId = url.searchParams.get("commerce_order_id")?.trim() ?? "";
  const artifactIntentId = url.searchParams.get("artifact_intent_id")?.trim() ?? "";
  const printOrderId = url.searchParams.get("print_order_id")?.trim() ?? "";
  const printifyOrderId = url.searchParams.get("printify_order_id")?.trim() ?? "";

  const provided = [
    shopifyOrderId,
    commerceOrderId,
    artifactIntentId,
    printOrderId,
    printifyOrderId,
  ].filter(Boolean);

  if (provided.length !== 1) return null;

  return {
    shopify_order_id: shopifyOrderId || undefined,
    commerce_order_id: commerceOrderId || undefined,
    artifact_intent_id: artifactIntentId || undefined,
    print_order_id: printOrderId || undefined,
    printify_order_id: printifyOrderId || undefined,
  };
}

async function resolveCommerceOrder(
  db: D1Database,
  query: FulfillmentLookupQuery
): Promise<CommerceOrderRow | null> {
  if (query.commerce_order_id) {
    return getCommerceOrderById(db, query.commerce_order_id);
  }
  if (query.shopify_order_id) {
    return getCommerceOrderByShopifyId(db, query.shopify_order_id);
  }
  if (query.print_order_id) {
    const printOrder = await getPrintOrderById(db, query.print_order_id);
    return printOrder
      ? getCommerceOrderById(db, printOrder.commerce_order_id)
      : null;
  }
  if (query.printify_order_id) {
    const printOrder = await getPrintOrderByPrintifyOrderId(db, query.printify_order_id);
    return printOrder
      ? getCommerceOrderById(db, printOrder.commerce_order_id)
      : null;
  }
  if (query.artifact_intent_id) {
    const matches = await findCommerceOrdersByArtifactIntentId(db, query.artifact_intent_id);
    return matches[0] ?? null;
  }
  return null;
}

/** GET /v1/operator/fulfillment/lookup — operator order chain lookup (O-003). */
export async function handleGetOperatorFulfillmentLookup(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  if (!operatorAuditAuthorized(request, env.OPERATOR_AUDIT_TOKEN)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
      401
    );
  }

  const query = parseLookupQuery(new URL(request.url));
  if (!query) {
    return errorResponse(
      "INVALID_LOOKUP_QUERY",
      "Provide exactly one of: shopify_order_id, commerce_order_id, artifact_intent_id, print_order_id, printify_order_id.",
      422
    );
  }

  const commerceOrder = await resolveCommerceOrder(db, query);
  if (!commerceOrder) {
    return errorResponse("FULFILLMENT_NOT_FOUND", "No matching fulfillment chain found.", 404);
  }

  const intentIds = JSON.parse(commerceOrder.artifact_intent_ids_json) as string[];
  const artifactIntents: ArtifactIntentRow[] = [];
  for (const intentId of intentIds) {
    const row = await getArtifactIntent(db, intentId);
    if (row) artifactIntents.push(row);
  }

  const printOrderIds = JSON.parse(commerceOrder.print_order_ids_json) as string[];
  const printOrders: PrintOrderRow[] = [];
  for (const orderId of printOrderIds) {
    const row = await getPrintOrderById(db, orderId);
    if (row) printOrders.push(row);
  }
  if (printOrders.length === 0) {
    const byCommerce = await getPrintOrderByCommerceOrderId(db, commerceOrder.commerce_order_id);
    if (byCommerce) printOrders.push(byCommerce);
  }

  const printOrdersOut = await Promise.all(
    printOrders.map((row) => printOrderWithMint(db, row))
  );

  return jsonResponse({
    query,
    commerce_order: commerceOrderResponse(commerceOrder),
    artifact_intents: artifactIntents.map(artifactIntentResponse),
    print_orders: printOrdersOut,
  });
}
