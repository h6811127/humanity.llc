import { getPlannedMintStatus } from "./fulfillment-mint";
import type { CommerceOrderRow } from "../db/commerce-orders";
import type { PrintOrderRow, PrintOrderStatus } from "../db/print-orders";

export interface BuyerMintPlannedItem {
  planned_qr_id: string;
  print_artifact_id: string;
}

export type BuyerMintState = "not_applicable" | "complete" | "pending";

export interface BuyerMintStatus {
  status: BuyerMintState;
  planned_items?: BuyerMintPlannedItem[];
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

function pickDominantPrintOrder(printOrders: PrintOrderRow[]): PrintOrderRow | null {
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
  return best;
}

/** Buyer-safe mint readiness for personalized print orders (email+order auth at handler). */
export async function buildBuyerMintStatus(
  db: D1Database,
  commerce: CommerceOrderRow,
  printOrders: PrintOrderRow[]
): Promise<BuyerMintStatus> {
  if (
    commerce.status === "held_for_review" ||
    commerce.status === "canceled" ||
    commerce.status === "refunded"
  ) {
    return { status: "not_applicable" };
  }

  if (fulfillmentMode(commerce) !== "personalized") {
    return { status: "not_applicable" };
  }

  const printOrder = pickDominantPrintOrder(printOrders);
  if (!printOrder) {
    return { status: "pending" };
  }

  if (printOrder.status === "canceled" || printOrder.status === "unfulfillable") {
    return { status: "not_applicable" };
  }

  const mintStatus = await getPlannedMintStatus(db, printOrder);
  if (mintStatus.all_planned_minted) {
    return { status: "complete" };
  }

  const pendingItems = mintStatus.items
    .filter((item) => !item.minted && item.planned_qr_id && item.print_artifact_id)
    .map((item) => ({
      planned_qr_id: item.planned_qr_id,
      print_artifact_id: item.print_artifact_id,
    }));

  if (pendingItems.length === 0) {
    return { status: "complete" };
  }

  return {
    status: "pending",
    planned_items: pendingItems,
  };
}
