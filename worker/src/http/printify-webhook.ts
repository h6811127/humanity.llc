/**
 * Printify order webhooks → print order status updates (O-003).
 * Stores event id + hash only — no raw payload or shipping PII in D1.
 */
import {
  getPrintifyWebhookReceipt,
  insertPrintifyWebhookReceipt,
} from "../db/printify-webhooks";
import {
  getPrintOrderByPrintifyOrderId,
  updatePrintOrderStatus,
} from "../db/print-orders";
import type { Env } from "../env";
import { statusFromPrintifyWebhookEvent } from "../print/printify-status-map";
import { verifyPrintifyWebhookSignature } from "../print/printify-webhook-verify";
import { errorResponse, jsonResponse } from "./resolver";

interface PrintifyWebhookEnvelope {
  id?: unknown;
  type?: unknown;
  resource?: {
    id?: unknown;
    type?: unknown;
    data?: {
      status?: unknown;
      shop_id?: unknown;
    } | null;
  };
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readPrintifyOrderId(envelope: PrintifyWebhookEnvelope): string | null {
  const resource = envelope.resource;
  if (!resource || resource.type !== "order") return null;
  const id = resource.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

/** POST /v1/print/webhooks/printify */
export async function handlePostPrintifyWebhook(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const secret = env.PRINTIFY_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    return errorResponse(
      "PRINTIFY_WEBHOOK_UNCONFIGURED",
      "PRINTIFY_WEBHOOK_SECRET is not configured.",
      503
    );
  }

  const rawBody = await request.text();
  const verifyErr = await verifyPrintifyWebhookSignature(
    rawBody,
    request.headers.get("X-Pfy-Signature") ?? request.headers.get("x-pfy-signature"),
    secret
  );
  if (verifyErr === "missing_header") {
    return errorResponse("MISSING_SIGNATURE", "X-Pfy-Signature header required.", 401);
  }
  if (verifyErr === "invalid_signature") {
    return errorResponse("INVALID_SIGNATURE", "Printify webhook signature invalid.", 401);
  }

  let envelope: PrintifyWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as PrintifyWebhookEnvelope;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const eventId = typeof envelope.id === "string" ? envelope.id.trim() : "";
  const eventType = typeof envelope.type === "string" ? envelope.type.trim() : "";
  const printifyOrderId = readPrintifyOrderId(envelope);

  if (!eventId || !eventType) {
    return errorResponse("MALFORMED_REQUEST", "Webhook envelope missing id or type.", 422);
  }
  if (!printifyOrderId) {
    return errorResponse("MALFORMED_REQUEST", "Webhook resource must reference an order id.", 422);
  }

  const existing = await getPrintifyWebhookReceipt(db, eventId);
  if (existing) {
    return jsonResponse({
      event_id: eventId,
      duplicate: true,
      processing_status: existing.processing_status,
    });
  }

  const nowIso = new Date().toISOString();
  const payloadHash = await sha256Hex(rawBody);
  const providerStatus =
    typeof envelope.resource?.data?.status === "string"
      ? envelope.resource.data.status.trim()
      : null;
  const nextStatus = statusFromPrintifyWebhookEvent(eventType, providerStatus);

  const printOrder = await getPrintOrderByPrintifyOrderId(db, printifyOrderId);
  if (!printOrder) {
    await insertPrintifyWebhookReceipt(db, {
      event_id: eventId,
      event_type: eventType,
      printify_order_id: printifyOrderId,
      print_order_id: null,
      payload_hash: payloadHash,
      processing_status: "ignored",
      received_at: nowIso,
    });
    return jsonResponse({
      event_id: eventId,
      printify_order_id: printifyOrderId,
      processing_status: "ignored",
      reason: "PRINT_ORDER_NOT_FOUND",
    });
  }

  if (!nextStatus) {
    await insertPrintifyWebhookReceipt(db, {
      event_id: eventId,
      event_type: eventType,
      printify_order_id: printifyOrderId,
      print_order_id: printOrder.order_id,
      payload_hash: payloadHash,
      processing_status: "ignored",
      received_at: nowIso,
    });
    return jsonResponse({
      event_id: eventId,
      printify_order_id: printifyOrderId,
      print_order_id: printOrder.order_id,
      processing_status: "ignored",
      reason: "NO_STATUS_TRANSITION",
    });
  }

  await updatePrintOrderStatus(db, printOrder.order_id, nextStatus, nowIso);
  await insertPrintifyWebhookReceipt(db, {
    event_id: eventId,
    event_type: eventType,
    printify_order_id: printifyOrderId,
    print_order_id: printOrder.order_id,
    payload_hash: payloadHash,
    processing_status: "processed",
    received_at: nowIso,
  });

  return jsonResponse({
    event_id: eventId,
    printify_order_id: printifyOrderId,
    print_order_id: printOrder.order_id,
    status: nextStatus,
    processing_status: "processed",
  });
}
