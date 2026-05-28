import type { PrintifyShippingAddress } from "../print/printify-shipping";
import {
  decryptFulfillmentJson,
  encryptFulfillmentJson,
  type FulfillmentPiiEnv,
} from "../commerce/fulfillment-pii-crypto";

export interface CommerceFulfillmentPiiRow {
  commerce_order_id: string;
  shipping_iv_b64: string;
  shipping_ciphertext_b64: string;
  created_at: string;
  updated_at: string;
}

export async function upsertEncryptedShippingAddress(
  db: D1Database,
  env: FulfillmentPiiEnv,
  input: {
    commerce_order_id: string;
    shipping_address: PrintifyShippingAddress;
    now_iso: string;
  }
): Promise<boolean> {
  const encrypted = await encryptFulfillmentJson(env, input.shipping_address);
  if (!encrypted) return false;

  await db
    .prepare(
      `INSERT INTO commerce_fulfillment_pii (
        commerce_order_id, shipping_iv_b64, shipping_ciphertext_b64, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(commerce_order_id) DO UPDATE SET
        shipping_iv_b64 = excluded.shipping_iv_b64,
        shipping_ciphertext_b64 = excluded.shipping_ciphertext_b64,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.commerce_order_id,
      encrypted.iv_b64,
      encrypted.ciphertext_b64,
      input.now_iso,
      input.now_iso
    )
    .run();

  return true;
}

export async function loadEncryptedShippingAddress(
  db: D1Database,
  env: FulfillmentPiiEnv,
  commerceOrderId: string
): Promise<PrintifyShippingAddress | null> {
  const row = await db
    .prepare(
      `SELECT commerce_order_id, shipping_iv_b64, shipping_ciphertext_b64, created_at, updated_at
       FROM commerce_fulfillment_pii WHERE commerce_order_id = ?`
    )
    .bind(commerceOrderId)
    .first<CommerceFulfillmentPiiRow>();

  if (!row) return null;

  return decryptFulfillmentJson<PrintifyShippingAddress>(env, {
    iv_b64: row.shipping_iv_b64,
    ciphertext_b64: row.shipping_ciphertext_b64,
  });
}
