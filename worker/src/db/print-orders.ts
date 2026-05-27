export const PRINT_ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "payment_failed",
  "paid",
  "submitted",
  "awaiting_production_approval",
  "in_production",
  "fulfilled",
  "partially_fulfilled",
  "on_hold",
  "has_issues",
  "unfulfillable",
  "canceled",
] as const;

export type PrintOrderStatus = (typeof PRINT_ORDER_STATUSES)[number];

export interface PrintOrderRow {
  order_id: string;
  profile_id: string;
  print_artifact_ids_json: string;
  planned_item_qr_ids_json: string;
  commerce_order_id: string;
  shopify_order_id: string;
  printify_order_id: string | null;
  printify_shop_id: number | null;
  template_id: string;
  status: PrintOrderStatus;
  shipping_method: string;
  created_at: string;
  updated_at: string;
}

export interface InsertPrintOrderInput {
  order_id: string;
  profile_id: string;
  print_artifact_ids: string[];
  planned_item_qr_ids: string[];
  commerce_order_id: string;
  shopify_order_id: string;
  template_id: string;
  status: PrintOrderStatus;
  shipping_method: string;
  created_at: string;
}

export async function getPrintOrderByPrintifyOrderId(
  db: D1Database,
  printifyOrderId: string
): Promise<PrintOrderRow | null> {
  return db
    .prepare(
      `SELECT order_id, profile_id, print_artifact_ids_json, planned_item_qr_ids_json,
              commerce_order_id, shopify_order_id, printify_order_id, printify_shop_id,
              template_id, status, shipping_method, created_at, updated_at
       FROM print_orders WHERE printify_order_id = ?`
    )
    .bind(printifyOrderId)
    .first<PrintOrderRow>();
}

export async function getPrintOrdersByCommerceOrderId(
  db: D1Database,
  commerceOrderId: string
): Promise<PrintOrderRow[]> {
  const primary = await getPrintOrderByCommerceOrderId(db, commerceOrderId);
  return primary ? [primary] : [];
}

export async function getPrintOrderByCommerceOrderId(
  db: D1Database,
  commerceOrderId: string
): Promise<PrintOrderRow | null> {
  return db
    .prepare(
      `SELECT order_id, profile_id, print_artifact_ids_json, planned_item_qr_ids_json,
              commerce_order_id, shopify_order_id, printify_order_id, printify_shop_id,
              template_id, status, shipping_method, created_at, updated_at
       FROM print_orders WHERE commerce_order_id = ?`
    )
    .bind(commerceOrderId)
    .first<PrintOrderRow>();
}

export async function getPrintOrderById(
  db: D1Database,
  orderId: string
): Promise<PrintOrderRow | null> {
  return db
    .prepare(
      `SELECT order_id, profile_id, print_artifact_ids_json, planned_item_qr_ids_json,
              commerce_order_id, shopify_order_id, printify_order_id, printify_shop_id,
              template_id, status, shipping_method, created_at, updated_at
       FROM print_orders WHERE order_id = ?`
    )
    .bind(orderId)
    .first<PrintOrderRow>();
}

export async function insertPrintOrder(
  db: D1Database,
  input: InsertPrintOrderInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO print_orders (
        order_id, profile_id, print_artifact_ids_json, planned_item_qr_ids_json,
        commerce_order_id, shopify_order_id, template_id, status, shipping_method,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.order_id,
      input.profile_id,
      JSON.stringify(input.print_artifact_ids),
      JSON.stringify(input.planned_item_qr_ids),
      input.commerce_order_id,
      input.shopify_order_id,
      input.template_id,
      input.status,
      input.shipping_method,
      input.created_at,
      input.created_at
    )
    .run();
}

export async function updatePrintOrderStatus(
  db: D1Database,
  orderId: string,
  status: PrintOrderStatus,
  updatedAt: string,
  printifyOrderId: string | null = null,
  printifyShopId: number | null = null
): Promise<void> {
  await db
    .prepare(
      `UPDATE print_orders
       SET status = ?, updated_at = ?,
           printify_order_id = COALESCE(?, printify_order_id),
           printify_shop_id = COALESCE(?, printify_shop_id)
       WHERE order_id = ?`
    )
    .bind(status, updatedAt, printifyOrderId, printifyShopId, orderId)
    .run();
}
