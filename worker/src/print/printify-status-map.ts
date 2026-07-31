import type { PrintOrderStatus } from "../db/print-orders";

/** Map Printify order status strings to internal print order status (O-003). */
export function mapPrintifyOrderStatus(raw: string): PrintOrderStatus | null {
  const status = raw.trim().toLowerCase();
  switch (status) {
    case "pending":
    case "sending-to-production":
      return "submitted";
    case "on-hold":
      return "on_hold";
    case "in-production":
      return "in_production";
    case "fulfilled":
      return "fulfilled";
    case "canceled":
      return "canceled";
    case "has-issues":
      return "has_issues";
    default:
      return null;
  }
}

export type PrintifyWebhookEventType =
  | "order:created"
  | "order:updated"
  | "order:sent-to-production"
  | "order:shipment:created"
  | "order:shipment:delivered";

/** Derive internal status from Printify webhook event type + optional provider status. */
export function statusFromPrintifyWebhookEvent(
  eventType: string,
  providerStatus: string | null
): PrintOrderStatus | null {
  switch (eventType) {
    case "order:sent-to-production":
      return "in_production";
    case "order:shipment:created":
    case "order:shipment:delivered":
      return "fulfilled";
    case "order:updated":
      return providerStatus ? mapPrintifyOrderStatus(providerStatus) : null;
    case "order:created":
      return null;
    default:
      return null;
  }
}

/**
 * Happy-path progress rank. Null means an exception/side status that may apply
 * from any point (canceled, on_hold, has_issues, etc.).
 */
export function printifyWebhookStatusRank(status: PrintOrderStatus): number | null {
  switch (status) {
    case "submitted":
      return 10;
    case "awaiting_production_approval":
      return 20;
    case "in_production":
      return 30;
    case "partially_fulfilled":
      return 40;
    case "fulfilled":
      return 50;
    default:
      return null;
  }
}

/**
 * Reject stale Printify deliveries that would regress buyer-visible progress
 * (e.g. fulfilled ← delayed order:sent-to-production / order:updated).
 * Exception statuses (canceled, on_hold, has_issues, …) still apply.
 */
export function shouldApplyPrintifyStatus(
  current: PrintOrderStatus,
  next: PrintOrderStatus
): boolean {
  if (current === next) return false;
  const nextRank = printifyWebhookStatusRank(next);
  if (nextRank === null) return true;
  const currentRank = printifyWebhookStatusRank(current);
  if (currentRank === null) return true;
  return nextRank >= currentRank;
}
