/**
 * Shopify order webhooks → commerce order links (O-001).
 * Printify submission deferred to O-002; missing metadata holds for operator review.
 */
import { hashBuyerEmail } from "../commerce/buyer-email-hash";
import { fulfillmentPiiEncryptionConfigured } from "../commerce/fulfillment-pii-crypto";
import { parseShopifyOrderShippingAddress } from "../commerce/shopify-shipping-address";
import { upsertEncryptedShippingAddress } from "../db/commerce-fulfillment-pii";
import {
  countTier0LineQuantity,
  extractShopifyOrderMetadata,
  shopifyOrderIsPaid,
  type ShopifyOrderLike,
} from "../commerce/shopify-order-metadata";
import { readTier0FulfillmentConfig } from "../commerce/tier0-fulfillment-config";
import {
  getArtifactIntent,
  updateArtifactIntentStatus,
  type ArtifactIntentRow,
} from "../db/artifact-intents";
import {
  getCommerceOrderByShopifyId,
  getShopifyWebhookReceipt,
  insertCommerceOrder,
  insertShopifyWebhookReceipt,
  updateCommerceOrderStatus,
  type CommerceOrderRow,
} from "../db/commerce-orders";
import { errorResponse, jsonResponse } from "./resolver";
import { verifyShopifyWebhookHmac } from "./shopify-webhook-verify";
import type { Env } from "../env";
import { generateCommerceOrderId } from "../id";
import { queuePrintOrderAfterPaidWebhook } from "../print/print-orders-handler";

const PAID_TOPICS = new Set(["orders/paid", "orders/create"]);
const CANCELED_TOPICS = new Set(["orders/cancelled", "orders/canceled"]);
const REFUND_TOPICS = new Set(["refunds/create", "orders/refunded"]);

interface IntentValidation {
  artifact_intent_ids: string[];
  profile_id: string | null;
  hold_reason: string | null;
  status: "processing" | "held_for_review";
  fulfillment_mode: "personalized" | "tier0_batch" | null;
}

function commerceOrderResponse(row: CommerceOrderRow, duplicate = false) {
  const intentIds = JSON.parse(row.artifact_intent_ids_json) as string[];
  return {
    commerce_order_id: row.commerce_order_id,
    shopify_order_id: row.shopify_order_id,
    shopify_checkout_id: row.shopify_checkout_id,
    profile_id: row.profile_id,
    artifact_intent_ids: intentIds,
    print_order_ids: JSON.parse(row.print_order_ids_json) as string[],
    status: row.status,
    hold_reason: row.hold_reason,
    fulfillment_mode:
      row.status === "processing" && intentIds.length === 0 && row.profile_id
        ? "tier0_batch"
        : intentIds.length > 0
          ? "personalized"
          : null,
    duplicate,
  };
}

function isIntentExpired(row: ArtifactIntentRow, nowMs: number): boolean {
  const expiresMs = Date.parse(row.expires_at);
  return Number.isFinite(expiresMs) && expiresMs <= nowMs;
}

async function validatePaidOrderIntents(
  db: D1Database,
  metadata: NonNullable<ReturnType<typeof extractShopifyOrderMetadata>>,
  nowIso: string
): Promise<IntentValidation> {
  let profileId = metadata.profile_id;
  const nowMs = Date.parse(nowIso);

  for (const intentId of metadata.artifact_intent_ids) {
    const row = await getArtifactIntent(db, intentId);
    if (!row) {
      return {
        artifact_intent_ids: metadata.artifact_intent_ids,
        profile_id: profileId,
        hold_reason: "CHECKOUT_METADATA_MISSING",
        status: "held_for_review",
        fulfillment_mode: null,
      };
    }
    if (row.status === "converted") {
      return {
        artifact_intent_ids: metadata.artifact_intent_ids,
        profile_id: profileId ?? row.profile_id,
        hold_reason: "ARTIFACT_INTENT_ALREADY_CONVERTED",
        status: "held_for_review",
        fulfillment_mode: null,
      };
    }
    if (isIntentExpired(row, nowMs)) {
      if (row.status !== "expired" && row.status !== "converted") {
        await updateArtifactIntentStatus(db, intentId, "expired", nowIso);
      }
      return {
        artifact_intent_ids: metadata.artifact_intent_ids,
        profile_id: profileId ?? row.profile_id,
        hold_reason: "ARTIFACT_INTENT_EXPIRED",
        status: "held_for_review",
        fulfillment_mode: null,
      };
    }
    if (row.status === "blocked") {
      return {
        artifact_intent_ids: metadata.artifact_intent_ids,
        profile_id: profileId ?? row.profile_id,
        hold_reason: "CHECKOUT_METADATA_MISSING",
        status: "held_for_review",
        fulfillment_mode: null,
      };
    }
    if (!profileId) profileId = row.profile_id;
    else if (profileId !== row.profile_id) {
      return {
        artifact_intent_ids: metadata.artifact_intent_ids,
        profile_id: profileId,
        hold_reason: "CHECKOUT_METADATA_MISSING",
        status: "held_for_review",
        fulfillment_mode: null,
      };
    }
  }

  return {
    artifact_intent_ids: metadata.artifact_intent_ids,
    profile_id: profileId,
    hold_reason: null,
    status: "processing",
    fulfillment_mode: "personalized",
  };
}

async function resolvePaidOrderValidation(
  db: D1Database,
  order: ShopifyOrderLike,
  metadata: NonNullable<ReturnType<typeof extractShopifyOrderMetadata>>,
  env: Env,
  nowIso: string
): Promise<IntentValidation> {
  if (metadata.artifact_intent_ids.length > 0) {
    return validatePaidOrderIntents(db, metadata, nowIso);
  }

  const tier0 = readTier0FulfillmentConfig(env);
  if (tier0 && countTier0LineQuantity(order, tier0.shopify_variant_ids) > 0) {
    return {
      artifact_intent_ids: [],
      profile_id: tier0.campaign_profile_id,
      hold_reason: null,
      status: "processing",
      fulfillment_mode: "tier0_batch",
    };
  }

  return {
    artifact_intent_ids: [],
    profile_id: metadata.profile_id,
    hold_reason: "CHECKOUT_METADATA_MISSING",
    status: "held_for_review",
    fulfillment_mode: null,
  };
}

async function markIntentsConverted(
  db: D1Database,
  intentIds: string[],
  nowIso: string
): Promise<void> {
  for (const intentId of intentIds) {
    const row = await getArtifactIntent(db, intentId);
    if (!row || row.status === "converted") continue;
    await updateArtifactIntentStatus(db, intentId, "converted", nowIso);
  }
}

async function recoverDuplicateProcessingOrder(
  db: D1Database,
  row: CommerceOrderRow,
  nowIso: string
): Promise<CommerceOrderRow> {
  if (row.status !== "processing") return row;

  const printOrderIds = await queuePrintOrderAfterPaidWebhook(db, row, nowIso);
  return {
    ...row,
    print_order_ids_json: JSON.stringify(printOrderIds),
    updated_at: printOrderIds.length > 0 ? nowIso : row.updated_at,
  };
}

async function handlePaidOrder(
  db: D1Database,
  order: ShopifyOrderLike,
  env: Env,
  nowIso: string
): Promise<
  | { ok: true; row: CommerceOrderRow; duplicate: boolean }
  | { ok: false; response: Response }
> {
  const metadata = extractShopifyOrderMetadata(order);
  if (!metadata) {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Shopify order id missing.", 422),
    };
  }

  const existing = await getCommerceOrderByShopifyId(db, metadata.shopify_order_id);
  if (existing) {
    const recovered = await recoverDuplicateProcessingOrder(db, existing, nowIso);
    return { ok: true, row: recovered, duplicate: true };
  }

  const validation = await resolvePaidOrderValidation(db, order, metadata, env, nowIso);
  const commerceOrderId = generateCommerceOrderId();
  const buyerEmailHash = metadata.buyer_email
    ? await hashBuyerEmail(metadata.buyer_email)
    : null;

  await insertCommerceOrder(db, {
    commerce_order_id: commerceOrderId,
    shopify_order_id: metadata.shopify_order_id,
    shopify_checkout_id: metadata.shopify_checkout_id,
    shopify_order_number: metadata.shopify_order_number,
    buyer_email_hash: buyerEmailHash,
    profile_id: validation.profile_id,
    artifact_intent_ids: validation.artifact_intent_ids,
    status: validation.status,
    hold_reason: validation.hold_reason,
    created_at: nowIso,
  });

  if (validation.status === "processing") {
    await markIntentsConverted(db, validation.artifact_intent_ids, nowIso);
  }

  if (fulfillmentPiiEncryptionConfigured(env)) {
    const shippingAddress = parseShopifyOrderShippingAddress(order);
    if (shippingAddress) {
      await upsertEncryptedShippingAddress(db, env, {
        commerce_order_id: commerceOrderId,
        shipping_address: shippingAddress,
        now_iso: nowIso,
      });
    }
  }

  let printOrderIds: string[] = [];
  const row: CommerceOrderRow = {
    commerce_order_id: commerceOrderId,
    shopify_order_id: metadata.shopify_order_id,
    shopify_checkout_id: metadata.shopify_checkout_id,
    shopify_order_number: metadata.shopify_order_number,
    buyer_email_hash: buyerEmailHash,
    profile_id: validation.profile_id,
    artifact_intent_ids_json: JSON.stringify(validation.artifact_intent_ids),
    print_order_ids_json: "[]",
    status: validation.status,
    hold_reason: validation.hold_reason,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (validation.status === "processing") {
    printOrderIds = await queuePrintOrderAfterPaidWebhook(db, row, nowIso);
    row.print_order_ids_json = JSON.stringify(printOrderIds);
  }

  return { ok: true, row, duplicate: false };
}

async function handleStatusOrder(
  db: D1Database,
  order: ShopifyOrderLike,
  status: "canceled" | "refunded",
  nowIso: string
): Promise<Response | null> {
  const metadata = extractShopifyOrderMetadata(order);
  if (!metadata) {
    return errorResponse("MALFORMED_REQUEST", "Shopify order id missing.", 422);
  }

  const existing = await getCommerceOrderByShopifyId(db, metadata.shopify_order_id);
  if (!existing) {
    return jsonResponse({ ignored: true, reason: "commerce_order_not_found" }, 200);
  }

  if (existing.status === status) {
    return jsonResponse(commerceOrderResponse(existing, true), 200);
  }

  await updateCommerceOrderStatus(db, existing.commerce_order_id, status, null, nowIso);
  return jsonResponse(
    commerceOrderResponse({ ...existing, status, hold_reason: null, updated_at: nowIso }),
    200
  );
}

export async function handlePostShopifyOrdersWebhook(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const secret = env.SHOPIFY_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    return errorResponse("WEBHOOK_UNCONFIGURED", "Shopify webhook secret is not configured.", 503);
  }

  const payload = await request.text();
  const verifyErr = await verifyShopifyWebhookHmac(
    payload,
    request.headers.get("X-Shopify-Hmac-Sha256"),
    secret
  );
  if (verifyErr === "missing_header") {
    return errorResponse("MISSING_WEBHOOK_SIGNATURE", "Missing Shopify HMAC header.", 401);
  }
  if (verifyErr) {
    return errorResponse("INVALID_WEBHOOK_SIGNATURE", "Invalid Shopify webhook signature.", 401);
  }

  const topic = request.headers.get("X-Shopify-Topic")?.trim() ?? "";
  const webhookId =
    request.headers.get("X-Shopify-Webhook-Id")?.trim() ??
    request.headers.get("X-Shopify-Event-Id")?.trim() ??
    "";

  if (!topic) {
    return errorResponse("MISSING_WEBHOOK_TOPIC", "Missing Shopify topic header.", 400);
  }

  let order: ShopifyOrderLike;
  try {
    order = JSON.parse(payload) as ShopifyOrderLike;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const metadata = extractShopifyOrderMetadata(order);
  const nowIso = new Date().toISOString();

  if (webhookId) {
    const receipt = await getShopifyWebhookReceipt(db, webhookId);
    if (receipt?.commerce_order_id) {
      const existing = metadata
        ? await getCommerceOrderByShopifyId(db, metadata.shopify_order_id)
        : null;
      if (existing) {
        return jsonResponse(commerceOrderResponse(existing, true), 200);
      }
    } else if (receipt) {
      return jsonResponse({ duplicate: true, webhook_id: webhookId }, 200);
    }
  }

  let commerceOrderId: string | null = null;
  let response: Response;

  if (PAID_TOPICS.has(topic)) {
    if (topic === "orders/create" && !shopifyOrderIsPaid(order)) {
      return jsonResponse({ ignored: true, topic, reason: "not_paid" }, 200);
    }
    const paid = await handlePaidOrder(db, order, env, nowIso);
    if (!paid.ok) return paid.response;
    commerceOrderId = paid.row.commerce_order_id;
    response = jsonResponse(commerceOrderResponse(paid.row, paid.duplicate), 200);
  } else if (CANCELED_TOPICS.has(topic)) {
    response = (await handleStatusOrder(db, order, "canceled", nowIso))!;
    const existing = metadata
      ? await getCommerceOrderByShopifyId(db, metadata.shopify_order_id)
      : null;
    commerceOrderId = existing?.commerce_order_id ?? null;
  } else if (REFUND_TOPICS.has(topic)) {
    response = (await handleStatusOrder(db, order, "refunded", nowIso))!;
    const existing = metadata
      ? await getCommerceOrderByShopifyId(db, metadata.shopify_order_id)
      : null;
    commerceOrderId = existing?.commerce_order_id ?? null;
  } else {
    return jsonResponse({ ignored: true, topic }, 200);
  }

  if (webhookId) {
    await insertShopifyWebhookReceipt(db, {
      webhook_id: webhookId,
      topic,
      shopify_order_id: metadata?.shopify_order_id ?? null,
      commerce_order_id: commerceOrderId,
      processed_at: nowIso,
    });
  }

  return response;
}
