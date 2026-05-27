/**
 * Queue print orders after validated Shopify payment (O-002).
 * Creates awaiting_production_approval rows; Printify API submit is operator-gated.
 */
import { getArtifactIntent } from "../db/artifact-intents";
import {
  updateCommerceOrderPrintOrderIds,
  type CommerceOrderRow,
} from "../db/commerce-orders";
import {
  getPrintOrderByCommerceOrderId,
  insertPrintOrder,
  type PrintOrderRow,
} from "../db/print-orders";
import { generatePrintOrderId } from "../id";
import { DEFAULT_PRINT_TEMPLATE_ID } from "../print/print-catalog";

export interface QueuedPrintOrder {
  print_order: PrintOrderRow;
  created: boolean;
}

export async function ensurePrintOrderForCommerceOrder(
  db: D1Database,
  commerceOrder: CommerceOrderRow,
  nowIso: string
): Promise<QueuedPrintOrder | null> {
  if (commerceOrder.status !== "processing" || !commerceOrder.profile_id) {
    return null;
  }

  const existing = await getPrintOrderByCommerceOrderId(db, commerceOrder.commerce_order_id);
  if (existing) {
    return { print_order: existing, created: false };
  }

  const intentIds = JSON.parse(commerceOrder.artifact_intent_ids_json) as string[];
  const printArtifactIds: string[] = [];
  const plannedItemQrIds: string[] = [];

  for (const intentId of intentIds) {
    const intent = await getArtifactIntent(db, intentId);
    if (!intent) continue;
    printArtifactIds.push(
      ...(JSON.parse(intent.planned_print_artifact_ids_json) as string[])
    );
    plannedItemQrIds.push(...(JSON.parse(intent.planned_item_qr_ids_json) as string[]));
  }

  if (plannedItemQrIds.length === 0) {
    return null;
  }

  const orderId = generatePrintOrderId();
  await insertPrintOrder(db, {
    order_id: orderId,
    profile_id: commerceOrder.profile_id,
    print_artifact_ids: printArtifactIds,
    planned_item_qr_ids: plannedItemQrIds,
    commerce_order_id: commerceOrder.commerce_order_id,
    shopify_order_id: commerceOrder.shopify_order_id,
    template_id: DEFAULT_PRINT_TEMPLATE_ID,
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: nowIso,
  });

  await updateCommerceOrderPrintOrderIds(
    db,
    commerceOrder.commerce_order_id,
    [orderId],
    nowIso
  );

  const row: PrintOrderRow = {
    order_id: orderId,
    profile_id: commerceOrder.profile_id,
    print_artifact_ids_json: JSON.stringify(printArtifactIds),
    planned_item_qr_ids_json: JSON.stringify(plannedItemQrIds),
    commerce_order_id: commerceOrder.commerce_order_id,
    shopify_order_id: commerceOrder.shopify_order_id,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: DEFAULT_PRINT_TEMPLATE_ID,
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: nowIso,
    updated_at: nowIso,
  };

  return { print_order: row, created: true };
}
