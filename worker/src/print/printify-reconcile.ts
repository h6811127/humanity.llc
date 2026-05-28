import {
  listPrintOrdersForReconciliation,
  syncPrintOrderFromPrintify,
  type PrintOrderRow,
} from "../db/print-orders";
import type { PrintifyEnv } from "./printify-client";
import { fetchPrintifyOrder } from "./printify-client";
import { mapPrintifyOrderStatus } from "./printify-status-map";
import {
  mergeTracking,
  parsePrintifyTrackingFromOrderBody,
  trackingIsEmpty,
  type PrintifyTracking,
} from "./printify-tracking";

export interface PrintifyReconcileResult {
  polled: number;
  updated: number;
  errors: number;
}

const DEFAULT_BATCH = 25;

function trackingFromRow(row: PrintOrderRow): PrintifyTracking | null {
  if (!row.tracking_carrier && !row.tracking_number && !row.tracking_url) return null;
  return {
    carrier: row.tracking_carrier,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
  };
}

/** Poll Printify for active print orders — repairs missed webhooks (PM-FR-33). */
export async function runPrintifyReconcile(
  db: D1Database,
  env: PrintifyEnv,
  options: { limit?: number; now?: string; fetchImpl?: typeof fetch } = {}
): Promise<PrintifyReconcileResult> {
  const limit = options.limit ?? DEFAULT_BATCH;
  const nowIso = options.now ?? new Date().toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;

  const rows = await listPrintOrdersForReconciliation(db, limit);
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.printify_order_id || row.printify_shop_id === null) continue;

    const fetched = await fetchPrintifyOrder(
      env,
      row.printify_shop_id,
      row.printify_order_id,
      fetchImpl
    );
    if (!fetched.ok) {
      errors += 1;
      continue;
    }

    const providerStatus =
      typeof fetched.body.status === "string" ? fetched.body.status.trim() : null;
    const nextStatus = providerStatus ? mapPrintifyOrderStatus(providerStatus) : null;
    const incomingTracking = parsePrintifyTrackingFromOrderBody(fetched.body);
    const mergedTracking = mergeTracking(trackingFromRow(row), incomingTracking);

    const statusChanged = nextStatus !== null && nextStatus !== row.status;
    const trackingChanged =
      mergedTracking !== null &&
      !trackingIsEmpty(mergedTracking) &&
      (mergedTracking.carrier !== row.tracking_carrier ||
        mergedTracking.tracking_number !== row.tracking_number ||
        mergedTracking.tracking_url !== row.tracking_url);

    if (statusChanged || trackingChanged) {
      await syncPrintOrderFromPrintify(db, {
        order_id: row.order_id,
        status: statusChanged ? nextStatus! : row.status,
        tracking: mergedTracking,
        last_reconciled_at: nowIso,
        updated_at: nowIso,
      });
      updated += 1;
    } else {
      await syncPrintOrderFromPrintify(db, {
        order_id: row.order_id,
        status: row.status,
        tracking: trackingFromRow(row),
        last_reconciled_at: nowIso,
        updated_at: row.updated_at,
      });
    }
  }

  return { polled: rows.length, updated, errors };
}
