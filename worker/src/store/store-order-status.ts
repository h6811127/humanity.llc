/**
 * Shopper-safe order status for humanity.llc post-purchase (Phase 5).
 * No shipping PII; timeline only.
 */
import type { CommerceOrderRow } from "../db/commerce-orders";
import {
  getPrintOrderByCommerceOrderId,
  getPrintOrderById,
  type PrintOrderRow,
  type PrintOrderStatus,
} from "../db/print-orders";
import {
  findCommerceOrdersByArtifactIntentId,
  getCommerceOrderByShopifyId,
} from "../db/commerce-orders";
import { getArtifactIntent } from "../db/artifact-intents";

export interface StoreOrderStatusTimelineStep {
  id: string;
  label: string;
  detail: string | null;
  state: "complete" | "current" | "pending" | "issue";
}

export interface StoreOrderStatusResponse {
  found: true;
  fulfillment_mode: "personalized" | "tier0_batch" | "tier0_inventory" | null;
  commerce_status: CommerceOrderRow["status"];
  hold_reason: string | null;
  product_id: string | null;
  print_status: PrintOrderStatus | null;
  print_status_label: string | null;
  timeline: StoreOrderStatusTimelineStep[];
  updated_at: string;
}

const ARTIFACT_INTENT_ID_PATTERN = /^ai_[1-9A-HJ-NP-Za-km-z]{10,24}$/;
const SHOPIFY_ORDER_ID_PATTERN = /^\d{3,20}$/;

export function isValidArtifactIntentLookupId(id: string): boolean {
  return ARTIFACT_INTENT_ID_PATTERN.test(id.trim());
}

export function isValidShopifyOrderLookupId(id: string): boolean {
  return SHOPIFY_ORDER_ID_PATTERN.test(id.trim());
}

export function printStatusLabel(status: PrintOrderStatus | null): string | null {
  if (!status) return null;
  switch (status) {
    case "awaiting_production_approval":
      return "Awaiting print approval";
    case "submitted":
      return "Sent to print partner";
    case "in_production":
      return "In production";
    case "fulfilled":
    case "partially_fulfilled":
      return "Shipped";
    case "on_hold":
      return "On hold";
    case "has_issues":
      return "Production issue — support will follow up";
    case "canceled":
      return "Print canceled";
    case "unfulfillable":
      return "Unable to fulfill";
    default:
      return "Processing";
  }
}

function fulfillmentMode(commerce: CommerceOrderRow): StoreOrderStatusResponse["fulfillment_mode"] {
  const intentIds = JSON.parse(commerce.artifact_intent_ids_json) as string[];
  if (intentIds.length > 0) return "personalized";
  if (commerce.status === "processing" && commerce.profile_id) {
    const printOrderIds = JSON.parse(commerce.print_order_ids_json) as string[];
    return printOrderIds.length > 0 ? "tier0_batch" : "tier0_inventory";
  }
  return null;
}

function holdDetail(holdReason: string | null): string | null {
  if (!holdReason) return null;
  switch (holdReason) {
    case "CHECKOUT_METADATA_MISSING":
      return "We received payment but need to verify order details. Support will follow up.";
    case "ARTIFACT_INTENT_EXPIRED":
      return "Your personalization session expired before payment cleared. Contact support.";
    default:
      return "Your order needs a manual review. Support will follow up.";
  }
}

export function buildOrderTimeline(
  commerce: CommerceOrderRow,
  printOrder: PrintOrderRow | null,
  productId: string | null
): StoreOrderStatusTimelineStep[] {
  const steps: StoreOrderStatusTimelineStep[] = [];
  const held = commerce.status === "held_for_review";
  const canceled = commerce.status === "canceled" || commerce.status === "refunded";

  steps.push({
    id: "payment",
    label: canceled ? "Payment update" : "Payment received",
    detail: held
      ? holdDetail(commerce.hold_reason)
      : canceled
        ? commerce.status === "refunded"
          ? "This order was refunded."
          : "This order was canceled."
        : productId
          ? "Your order is in our system."
          : "Your order is in our system.",
    state: held || canceled ? "issue" : "complete",
  });

  if (held) {
    steps.push({
      id: "fulfillment",
      label: "Fulfillment",
      detail: "Waiting for review to complete.",
      state: "pending",
    });
    return steps;
  }

  if (canceled) {
    return steps;
  }

  const mode = fulfillmentMode(commerce);
  if (mode === "tier0_inventory") {
    steps.push({
      id: "fulfillment",
      label: "Preparing shipment",
      detail: "Your item ships from our store inventory.",
      state: "current",
    });
    steps.push({
      id: "shipped",
      label: "Shipped",
      detail: "Carrier tracking may arrive in a separate email from Shopify.",
      state: "pending",
    });
    return steps;
  }

  const printStatus = printOrder?.status ?? null;
  const queued = Boolean(printOrder);
  const inPrint =
    printStatus === "submitted" ||
    printStatus === "in_production" ||
    printStatus === "on_hold" ||
    printStatus === "has_issues";
  const shipped =
    printStatus === "fulfilled" || printStatus === "partially_fulfilled";

  steps.push({
    id: "print_queued",
    label: "Print order queued",
    detail: queued
      ? "Your physical item is queued for production."
      : "Waiting for fulfillment queue.",
    state: queued ? (inPrint || shipped ? "complete" : "current") : "pending",
  });

  if (printStatus === "has_issues" || printStatus === "unfulfillable") {
    steps.push({
      id: "production",
      label: printStatusLabel(printStatus) ?? "Production issue",
      detail: "Our team is resolving this with the print partner.",
      state: "issue",
    });
    return steps;
  }

  steps.push({
    id: "production",
    label: "Production",
    detail: inPrint
      ? printStatusLabel(printStatus)
      : shipped
        ? "Production complete."
        : "Waiting for print partner.",
    state: shipped ? "complete" : inPrint ? "current" : "pending",
  });

  steps.push({
    id: "shipped",
    label: "Shipped",
    detail: shipped
      ? "Carrier tracking may arrive in a separate email from Shopify or the print partner."
      : "We will update this when your item ships.",
    state: shipped ? "complete" : "pending",
  });

  return steps;
}

export function buildStoreOrderStatusResponse(
  commerce: CommerceOrderRow,
  printOrder: PrintOrderRow | null,
  productId: string | null
): StoreOrderStatusResponse {
  const printStatus = printOrder?.status ?? null;
  return {
    found: true,
    fulfillment_mode: fulfillmentMode(commerce),
    commerce_status: commerce.status,
    hold_reason: commerce.hold_reason,
    product_id: productId,
    print_status: printStatus,
    print_status_label: printStatusLabel(printStatus),
    timeline: buildOrderTimeline(commerce, printOrder, productId),
    updated_at: printOrder?.updated_at ?? commerce.updated_at,
  };
}

async function resolveProductId(
  db: D1Database,
  commerce: CommerceOrderRow
): Promise<string | null> {
  const intentIds = JSON.parse(commerce.artifact_intent_ids_json) as string[];
  if (!intentIds.length) return null;
  const intent = await getArtifactIntent(db, intentIds[0]!);
  return intent?.product_id ?? null;
}

async function loadPrintOrder(
  db: D1Database,
  commerce: CommerceOrderRow
): Promise<PrintOrderRow | null> {
  const printOrderIds = JSON.parse(commerce.print_order_ids_json) as string[];
  if (printOrderIds.length) {
    const row = await getPrintOrderById(db, printOrderIds[0]!);
    if (row) return row;
  }
  return getPrintOrderByCommerceOrderId(db, commerce.commerce_order_id);
}

export async function lookupStoreOrderStatusByArtifactIntent(
  db: D1Database,
  artifactIntentId: string
): Promise<StoreOrderStatusResponse | null> {
  const matches = await findCommerceOrdersByArtifactIntentId(db, artifactIntentId);
  const commerce = matches[0];
  if (!commerce) return null;

  const intent = await getArtifactIntent(db, artifactIntentId);
  const printOrder = await loadPrintOrder(db, commerce);
  return buildStoreOrderStatusResponse(
    commerce,
    printOrder,
    intent?.product_id ?? null
  );
}

export async function lookupStoreOrderStatusByShopifyOrderId(
  db: D1Database,
  shopifyOrderId: string
): Promise<StoreOrderStatusResponse | null> {
  const commerce = await getCommerceOrderByShopifyId(db, shopifyOrderId);
  if (!commerce) return null;

  const productId = await resolveProductId(db, commerce);
  const printOrder = await loadPrintOrder(db, commerce);
  return buildStoreOrderStatusResponse(commerce, printOrder, productId);
}

export async function lookupStoreOrderStatusByShopifyOrderAndProfile(
  db: D1Database,
  shopifyOrderId: string,
  profileId: string
): Promise<StoreOrderStatusResponse | null> {
  const commerce = await getCommerceOrderByShopifyId(db, shopifyOrderId);
  if (!commerce || commerce.profile_id !== profileId) return null;

  const productId = await resolveProductId(db, commerce);
  const printOrder = await loadPrintOrder(db, commerce);
  return buildStoreOrderStatusResponse(commerce, printOrder, productId);
}
