export const COMMERCE_ORDER_STATUSES = [
  "paid",
  "processing",
  "fulfilled",
  "partially_fulfilled",
  "canceled",
  "refunded",
  "failed",
  "held_for_review",
] as const;

export type CommerceOrderStatus = (typeof COMMERCE_ORDER_STATUSES)[number];

export interface CommerceOrderRow {
  commerce_order_id: string;
  shopify_order_id: string;
  shopify_checkout_id: string | null;
  profile_id: string | null;
  artifact_intent_ids_json: string;
  print_order_ids_json: string;
  status: CommerceOrderStatus;
  hold_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertCommerceOrderInput {
  commerce_order_id: string;
  shopify_order_id: string;
  shopify_checkout_id: string | null;
  profile_id: string | null;
  artifact_intent_ids: string[];
  status: CommerceOrderStatus;
  hold_reason: string | null;
  created_at: string;
}

export async function getCommerceOrderByShopifyId(
  db: D1Database,
  shopifyOrderId: string
): Promise<CommerceOrderRow | null> {
  return db
    .prepare(
      `SELECT commerce_order_id, shopify_order_id, shopify_checkout_id, profile_id,
              artifact_intent_ids_json, print_order_ids_json, status, hold_reason,
              created_at, updated_at
       FROM commerce_order_links WHERE shopify_order_id = ?`
    )
    .bind(shopifyOrderId)
    .first<CommerceOrderRow>();
}

export async function getCommerceOrderById(
  db: D1Database,
  commerceOrderId: string
): Promise<CommerceOrderRow | null> {
  return db
    .prepare(
      `SELECT commerce_order_id, shopify_order_id, shopify_checkout_id, profile_id,
              artifact_intent_ids_json, print_order_ids_json, status, hold_reason,
              created_at, updated_at
       FROM commerce_order_links WHERE commerce_order_id = ?`
    )
    .bind(commerceOrderId)
    .first<CommerceOrderRow>();
}

export async function insertCommerceOrder(
  db: D1Database,
  input: InsertCommerceOrderInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO commerce_order_links (
        commerce_order_id, shopify_order_id, shopify_checkout_id, profile_id,
        artifact_intent_ids_json, print_order_ids_json, status, hold_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`
    )
    .bind(
      input.commerce_order_id,
      input.shopify_order_id,
      input.shopify_checkout_id,
      input.profile_id,
      JSON.stringify(input.artifact_intent_ids),
      input.status,
      input.hold_reason,
      input.created_at,
      input.created_at
    )
    .run();
}

export async function updateCommerceOrderStatus(
  db: D1Database,
  commerceOrderId: string,
  status: CommerceOrderStatus,
  holdReason: string | null,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE commerce_order_links
       SET status = ?, hold_reason = ?, updated_at = ?
       WHERE commerce_order_id = ?`
    )
    .bind(status, holdReason, updatedAt, commerceOrderId)
    .run();
}

export async function updateCommerceOrderPrintOrderIds(
  db: D1Database,
  commerceOrderId: string,
  printOrderIds: string[],
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE commerce_order_links
       SET print_order_ids_json = ?, updated_at = ?
       WHERE commerce_order_id = ?`
    )
    .bind(JSON.stringify(printOrderIds), updatedAt, commerceOrderId)
    .run();
}

export async function getShopifyWebhookReceipt(
  db: D1Database,
  webhookId: string
): Promise<{ webhook_id: string; commerce_order_id: string | null } | null> {
  return db
    .prepare(
      `SELECT webhook_id, commerce_order_id FROM shopify_webhook_receipts WHERE webhook_id = ?`
    )
    .bind(webhookId)
    .first<{ webhook_id: string; commerce_order_id: string | null }>();
}

export async function insertShopifyWebhookReceipt(
  db: D1Database,
  input: {
    webhook_id: string;
    topic: string;
    shopify_order_id: string | null;
    commerce_order_id: string | null;
    processed_at: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO shopify_webhook_receipts (
        webhook_id, topic, shopify_order_id, commerce_order_id, processed_at
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      input.webhook_id,
      input.topic,
      input.shopify_order_id,
      input.commerce_order_id,
      input.processed_at
    )
    .run();
}
