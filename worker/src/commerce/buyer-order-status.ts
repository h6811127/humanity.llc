import type { CommerceOrderRow } from "../db/commerce-orders";
import type { PrintOrderRow, PrintOrderStatus } from "../db/print-orders";

export type BuyerFacingStatus =
  | "processing"
  | "held"
  | "in_production"
  | "shipped"
  | "issue"
  | "canceled";

export interface BuyerOrderStatusResponse {
  order_number: string | null;
  status: BuyerFacingStatus;
  status_label: string;
  message: string;
  fulfillment_mode: "personalized" | "tier0_batch" | null;
  updated_at: string;
}

function fulfillmentMode(row: CommerceOrderRow): "personalized" | "tier0_batch" | null {
  const intentIds = JSON.parse(row.artifact_intent_ids_json) as string[];
  if (intentIds.length > 0) return "personalized";
  if (row.profile_id && row.status === "processing") return "tier0_batch";
  return null;
}

function formatOrderNumber(orderNumber: number | null): string | null {
  if (orderNumber === null || !Number.isFinite(orderNumber)) return null;
  return `#${orderNumber}`;
}

function printStatusPriority(status: PrintOrderStatus): number {
  switch (status) {
    case "fulfilled":
    case "partially_fulfilled":
      return 50;
    case "in_production":
      return 40;
    case "submitted":
      return 30;
    case "awaiting_production_approval":
      return 20;
    case "on_hold":
    case "has_issues":
    case "unfulfillable":
      return 10;
    case "canceled":
      return 0;
    default:
      return 15;
  }
}

function dominantPrintStatus(printOrders: PrintOrderRow[]): PrintOrderStatus | null {
  if (printOrders.length === 0) return null;
  let best = printOrders[0]!;
  let bestScore = printStatusPriority(best.status);
  for (let i = 1; i < printOrders.length; i++) {
    const row = printOrders[i]!;
    const score = printStatusPriority(row.status);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best.status;
}

function mapPrintToBuyer(status: PrintOrderStatus): BuyerFacingStatus {
  switch (status) {
    case "fulfilled":
    case "partially_fulfilled":
      return "shipped";
    case "in_production":
    case "submitted":
      return "in_production";
    case "on_hold":
    case "has_issues":
    case "unfulfillable":
      return "issue";
    case "canceled":
      return "canceled";
    default:
      return "processing";
  }
}

const STATUS_COPY: Record<
  BuyerFacingStatus,
  { label: string; message: string }
> = {
  processing: {
    label: "Processing",
    message: "Payment received. We are preparing your order for print.",
  },
  held: {
    label: "Under review",
    message:
      "We need a moment to verify checkout details. If this persists, contact support with your order number.",
  },
  in_production: {
    label: "In production",
    message: "Your order is with our print partner. Tracking will appear when it ships.",
  },
  shipped: {
    label: "Shipped",
    message: "Your order has shipped. Check your email for carrier tracking from the store.",
  },
  issue: {
    label: "Needs attention",
    message:
      "Print fulfillment paused. Contact support with your order number — we will follow up.",
  },
  canceled: {
    label: "Canceled",
    message: "This order was canceled or refunded.",
  },
};

/** Build buyer-safe order status (no shipping PII, provider ids, or profile ids). */
export function buildBuyerOrderStatus(
  commerce: CommerceOrderRow,
  printOrders: PrintOrderRow[]
): BuyerOrderStatusResponse {
  const mode = fulfillmentMode(commerce);
  const orderNumber = formatOrderNumber(commerce.shopify_order_number);

  if (commerce.status === "held_for_review") {
    const copy = STATUS_COPY.held;
    return {
      order_number: orderNumber,
      status: "held",
      status_label: copy.label,
      message: copy.message,
      fulfillment_mode: mode,
      updated_at: commerce.updated_at,
    };
  }

  if (commerce.status === "canceled" || commerce.status === "refunded") {
    const copy = STATUS_COPY.canceled;
    return {
      order_number: orderNumber,
      status: "canceled",
      status_label: copy.label,
      message: copy.message,
      fulfillment_mode: mode,
      updated_at: commerce.updated_at,
    };
  }

  const printStatus = dominantPrintStatus(printOrders);
  if (printStatus) {
    const buyerStatus = mapPrintToBuyer(printStatus);
    const copy = STATUS_COPY[buyerStatus];
    const printRow =
      printOrders.find((row) => row.status === printStatus) ?? printOrders[0]!;
    return {
      order_number: orderNumber,
      status: buyerStatus,
      status_label: copy.label,
      message: copy.message,
      fulfillment_mode: mode,
      updated_at: printRow.updated_at,
    };
  }

  const copy = STATUS_COPY.processing;
  return {
    order_number: orderNumber,
    status: "processing",
    status_label: copy.label,
    message: copy.message,
    fulfillment_mode: mode,
    updated_at: commerce.updated_at,
  };
}
