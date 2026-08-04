/**
 * Cancel already-submitted Printify factory orders when Shopify refunds/cancels.
 * Complements pre-submit local cancel (#237): this path reaches Printify cancel.json.
 */
import {
  getPrintOrdersByCommerceOrderId,
  PRINTIFY_CANCELABLE_STATUSES,
  updatePrintOrderStatus,
  type PrintOrderRow,
  type PrintOrderStatus,
} from "../db/print-orders";
import { cancelPrintifyOrder, type PrintifyEnv } from "./printify-client";

export interface CancelSubmittedPrintifyResult {
  attempted: number;
  canceled: number;
  failed: number;
}

function isPrintifyCancelableStatus(status: PrintOrderStatus): boolean {
  return PRINTIFY_CANCELABLE_STATUSES.includes(status);
}

async function cancelOneSubmittedPrintOrder(
  db: D1Database,
  env: PrintifyEnv,
  row: PrintOrderRow,
  nowIso: string,
  fetchImpl: typeof fetch
): Promise<"canceled" | "failed" | "skipped"> {
  if (!isPrintifyCancelableStatus(row.status)) return "skipped";
  const printifyOrderId = row.printify_order_id?.trim() ?? "";
  const shopId = row.printify_shop_id;
  if (!printifyOrderId || shopId === null || shopId === undefined) return "skipped";

  const result = await cancelPrintifyOrder(env, shopId, printifyOrderId, fetchImpl);
  if (!result.ok) return "failed";

  await updatePrintOrderStatus(db, row.order_id, "canceled", nowIso);
  return "canceled";
}

/** Best-effort Printify cancel for submitted/on_hold print orders linked to a commerce order. */
export async function cancelSubmittedPrintifyOrdersForCommerceOrder(
  db: D1Database,
  env: PrintifyEnv,
  commerceOrderId: string,
  nowIso: string,
  fetchImpl: typeof fetch = fetch
): Promise<CancelSubmittedPrintifyResult> {
  const rows = await getPrintOrdersByCommerceOrderId(db, commerceOrderId);
  let attempted = 0;
  let canceled = 0;
  let failed = 0;

  for (const row of rows) {
    if (!isPrintifyCancelableStatus(row.status) || !row.printify_order_id) continue;
    attempted += 1;
    const outcome = await cancelOneSubmittedPrintOrder(db, env, row, nowIso, fetchImpl);
    if (outcome === "canceled") canceled += 1;
    else if (outcome === "failed") failed += 1;
  }

  return { attempted, canceled, failed };
}
