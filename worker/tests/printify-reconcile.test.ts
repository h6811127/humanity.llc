import { describe, expect, it, vi } from "vitest";

import type { PrintOrderRow } from "../src/db/print-orders";
import { runPrintifyReconcile } from "../src/print/printify-reconcile";

const PRINTIFY_ORDER_ID = "5a96f649b2439217d070f507";

function printOrderRow(overrides: Partial<PrintOrderRow> = {}): PrintOrderRow {
  return {
    order_id: "po_reconcileTest001",
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: "co_reconcileTest001",
    shopify_order_id: "450789469",
    printify_order_id: PRINTIFY_ORDER_ID,
    printify_shop_id: 99,
    template_id: "hc-sticker-square-v1",
    print_variant_id: null,
    print_frame_background: "white",
    status: "in_production",
    shipping_method: "standard",
    tracking_carrier: null,
    tracking_number: null,
    tracking_url: null,
    last_reconciled_at: null,
    created_at: "2026-05-27T00:00:00.000Z",
    updated_at: "2026-05-27T00:00:00.000Z",
    ...overrides,
  };
}

type DbState = {
  rows: PrintOrderRow[];
  lastSync: Record<string, unknown> | null;
  lastTouch: { order_id: string; last_reconciled_at: string } | null;
};

function dbFor(state: DbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        // Deep-copy so concurrent DB mutations during fetch do not alter the
        // list-time snapshot held by runPrintifyReconcile (matches D1 behavior).
        all: async () => ({
          results: state.rows.map((row) => ({ ...row })),
        }),
        run: async () => {
          if (
            sql.includes("UPDATE print_orders") &&
            sql.includes("SET last_reconciled_at = ?") &&
            !sql.includes("status = ?")
          ) {
            const lastReconciledAt = args[0] as string;
            const orderId = args[1] as string;
            state.lastTouch = {
              order_id: orderId,
              last_reconciled_at: lastReconciledAt,
            };
            const row = state.rows.find((r) => r.order_id === orderId);
            if (row) {
              row.last_reconciled_at = lastReconciledAt;
            }
            return { success: true, meta: { changes: row ? 1 : 0 } };
          }

          if (sql.includes("UPDATE print_orders") && sql.includes("last_reconciled_at")) {
            const cas = sql.includes("AND status = ?");
            const orderId = args[6] as string;
            const expectedStatus = cas ? (args[7] as PrintOrderRow["status"]) : null;
            const row = state.rows.find((r) => r.order_id === orderId);
            if (cas && row && expectedStatus !== null && row.status !== expectedStatus) {
              state.lastSync = {
                order_id: orderId,
                applied: false,
                expected_status: expectedStatus,
                current_status: row.status,
              };
              return { success: true, meta: { changes: 0 } };
            }

            state.lastSync = {
              order_id: orderId,
              status: args[0],
              tracking_carrier: args[1],
              tracking_number: args[2],
              tracking_url: args[3],
              last_reconciled_at: args[4],
              updated_at: args[5],
              applied: true,
            };
            if (row) {
              row.status = args[0] as PrintOrderRow["status"];
              row.tracking_carrier = args[1] as string | null;
              row.tracking_number = args[2] as string | null;
              row.tracking_url = args[3] as string | null;
              row.last_reconciled_at = args[4] as string;
              row.updated_at = args[5] as string;
            }
            return { success: true, meta: { changes: row ? 1 : 0 } };
          }
          return { success: true, meta: { changes: 0 } };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("runPrintifyReconcile", () => {
  it("updates status and tracking from Printify poll", async () => {
    const state: DbState = {
      rows: [printOrderRow()],
      lastSync: null,
      lastTouch: null,
    };

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: PRINTIFY_ORDER_ID,
          status: "fulfilled",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await runPrintifyReconcile(
      dbFor(state),
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:00:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 1,
      errors: 0,
      skipped_conflict: 0,
    });
    expect(state.rows[0]?.status).toBe("fulfilled");
    expect(state.rows[0]?.tracking_number).toBe("9400111899223344556677");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("persists tracking from Printify poll even when status is unchanged", async () => {
    const state: DbState = {
      rows: [printOrderRow({ status: "in_production" })],
      lastSync: null,
      lastTouch: null,
    };

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: PRINTIFY_ORDER_ID,
          status: "in-production",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await runPrintifyReconcile(
      dbFor(state),
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:05:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 1,
      errors: 0,
      skipped_conflict: 0,
    });
    expect(state.rows[0]?.status).toBe("in_production");
    expect(state.rows[0]?.tracking_number).toBe("9400111899223344556677");
    expect(state.lastSync?.updated_at).toBe("2026-05-27T01:05:00.000Z");
  });

  it("records poll errors without mutating the print order", async () => {
    const state: DbState = {
      rows: [printOrderRow()],
      lastSync: null,
      lastTouch: null,
    };

    const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));

    const result = await runPrintifyReconcile(
      dbFor(state),
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:10:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 0,
      errors: 1,
      skipped_conflict: 0,
    });
    expect(state.lastSync).toBeNull();
    expect(state.lastTouch).toBeNull();
    expect(state.rows[0]?.status).toBe("in_production");
    expect(state.rows[0]?.last_reconciled_at).toBeNull();
  });

  it("stamps last_reconciled_at on no-op polls without rewriting status", async () => {
    const state: DbState = {
      rows: [
        printOrderRow({
          tracking_carrier: "USPS",
          tracking_number: "9400111899223344556677",
          tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
          updated_at: "2026-05-27T00:30:00.000Z",
        }),
      ],
      lastSync: null,
      lastTouch: null,
    };

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: PRINTIFY_ORDER_ID,
          status: "in-production",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await runPrintifyReconcile(
      dbFor(state),
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:15:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 0,
      errors: 0,
      skipped_conflict: 0,
    });
    expect(state.lastSync).toBeNull();
    expect(state.lastTouch).toEqual({
      order_id: "po_reconcileTest001",
      last_reconciled_at: "2026-05-27T01:15:00.000Z",
    });
    expect(state.rows[0]?.last_reconciled_at).toBe("2026-05-27T01:15:00.000Z");
    expect(state.rows[0]?.status).toBe("in_production");
    expect(state.rows[0]?.updated_at).toBe("2026-05-27T00:30:00.000Z");
  });

  it("does not clobber a concurrent webhook advance on no-op polls", async () => {
    const state: DbState = {
      rows: [printOrderRow({ status: "in_production" })],
      lastSync: null,
      lastTouch: null,
    };
    const db = dbFor(state);

    const fetchImpl = vi.fn(async () => {
      // Simulate order:shipment:created landing while Printify GET still looks
      // like the list-time status (or before reconcile writes).
      state.rows[0]!.status = "fulfilled";
      state.rows[0]!.tracking_number = "9400111899223344556677";
      state.rows[0]!.updated_at = "2026-05-27T01:20:30.000Z";
      return new Response(
        JSON.stringify({
          id: PRINTIFY_ORDER_ID,
          status: "in-production",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await runPrintifyReconcile(
      db,
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:21:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 0,
      errors: 0,
      skipped_conflict: 0,
    });
    expect(state.lastSync).toBeNull();
    expect(state.rows[0]?.status).toBe("fulfilled");
    expect(state.rows[0]?.tracking_number).toBe("9400111899223344556677");
    expect(state.rows[0]?.last_reconciled_at).toBe("2026-05-27T01:21:00.000Z");
  });

  it("CAS-skips stale status writes when a concurrent webhook advanced the row", async () => {
    const state: DbState = {
      rows: [printOrderRow({ status: "submitted" })],
      lastSync: null,
      lastTouch: null,
    };
    const db = dbFor(state);

    const fetchImpl = vi.fn(async () => {
      // Shopify cancel path (or local cancel) advanced the row while reconcile
      // still holds the list-time snapshot and Printify still reports submitted.
      state.rows[0]!.status = "canceled";
      state.rows[0]!.updated_at = "2026-05-27T01:30:30.000Z";
      return new Response(
        JSON.stringify({
          id: PRINTIFY_ORDER_ID,
          status: "on-hold",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await runPrintifyReconcile(
      db,
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:31:00.000Z", fetchImpl }
    );

    expect(result).toEqual({
      polled: 1,
      updated: 0,
      errors: 0,
      skipped_conflict: 1,
    });
    expect(state.lastSync?.applied).toBe(false);
    expect(state.rows[0]?.status).toBe("canceled");
    expect(state.rows[0]?.updated_at).toBe("2026-05-27T01:30:30.000Z");
  });
});
