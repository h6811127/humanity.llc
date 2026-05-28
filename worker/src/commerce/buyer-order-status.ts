import type { CommerceOrderRow } from "../db/commerce-orders";
import type { PrintOrderRow, PrintOrderStatus } from "../db/print-orders";

export type BuyerFacingStatus =
  | "processing"
  | "held"
  | "in_production"
  | "shipped"
  | "issue"
  | "canceled";

export interface BuyerOrderTracking {
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

export interface BuyerOrderStatusResponse {
  order_number: string | null;
  status: BuyerFacingStatus;
  status_label: string;
  message: string;
  fulfillment_mode: "personalized" | "tier0_batch" | "tier0_inventory" | null;
  tracking: BuyerOrderTracking | null;
  updated_at: string;
}

function fulfillmentMode(
  row: CommerceOrderRow
): "personalized" | "tier0_batch" | "tier0_inventory" | null {
  const intentIds = JSON.parse(row.artifact_intent_ids_json) as string[];
  if (intentIds.length > 0) return "personalized";
  if (row.profile_id && row.status === "processing") {
    const printOrderIds = JSON.parse(row.print_order_ids_json) as string[];
    return printOrderIds.length > 0 ? "tier0_batch" : "tier0_inventory";
  }
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

function trackingFromPrintOrder(row: PrintOrderRow): BuyerOrderTracking | null {
  if (!row.tracking_carrier && !row.tracking_number && !row.tracking_url) return null;
  return {
    carrier: row.tracking_carrier,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
  };
}

function pickDominantPrintOrder(printOrders: PrintOrderRow[]): PrintOrderRow | null {
  const status = dominantPrintStatus(printOrders);
  if (!status) return null;
  return printOrders.find((row) => row.status === status) ?? printOrders[0] ?? null;
}

function messageForBuyerStatus(
  buyerStatus: BuyerFacingStatus,
  tracking: BuyerOrderTracking | null
): { label: string; message: string } {
  const copy = STATUS_COPY[buyerStatus];
  if (buyerStatus === "shipped" && tracking?.tracking_url) {
    return {
      label: copy.label,
      message: "Your order is on its way. Use the tracking link below for carrier updates.",
    };
  }
  if (buyerStatus === "shipped" && tracking?.tracking_number) {
    return {
      label: copy.label,
      message: `Your order has shipped. Tracking number: ${tracking.tracking_number}.`,
    };
  }
  return copy;
}

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
      tracking: null,
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
      tracking: null,
      updated_at: commerce.updated_at,
    };
  }

  const printRow = pickDominantPrintOrder(printOrders);
  if (printRow) {
    const buyerStatus = mapPrintToBuyer(printRow.status);
    const tracking = trackingFromPrintOrder(printRow);
    const copy =
      mode === "tier0_inventory" && buyerStatus === "processing"
        ? {
            label: "Processing",
            message: "Payment received. Your item ships from our store inventory.",
          }
        : messageForBuyerStatus(buyerStatus, tracking);
    return {
      order_number: orderNumber,
      status: buyerStatus,
      status_label: copy.label,
      message: copy.message,
      fulfillment_mode: mode,
      tracking,
      updated_at: printRow.updated_at,
    };
  }

  const copy =
    mode === "tier0_inventory"
      ? {
          label: "Processing",
          message: "Payment received. Your item ships from our store inventory.",
        }
      : STATUS_COPY.processing;
  return {
    order_number: orderNumber,
    status: "processing",
    status_label: copy.label,
    message: copy.message,
    fulfillment_mode: mode,
    tracking: null,
    updated_at: commerce.updated_at,
  };
}
