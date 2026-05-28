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
};

function dbFor(state: DbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        all: async () => ({ results: state.rows }),
        run: async () => {
          if (sql.includes("UPDATE print_orders") && sql.includes("last_reconciled_at")) {
            state.lastSync = {
              order_id: args[6],
              status: args[0],
              tracking_carrier: args[1],
              tracking_number: args[2],
              tracking_url: args[3],
              last_reconciled_at: args[4],
              updated_at: args[5],
            };
            const row = state.rows.find((r) => r.order_id === args[6]);
            if (row) {
              row.status = args[0] as PrintOrderRow["status"];
              row.tracking_carrier = args[1] as string | null;
              row.tracking_number = args[2] as string | null;
              row.tracking_url = args[3] as string | null;
              row.last_reconciled_at = args[4] as string;
              row.updated_at = args[5] as string;
            }
          }
          return { success: true };
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

    expect(result).toEqual({ polled: 1, updated: 1, errors: 0 });
    expect(state.rows[0]?.status).toBe("fulfilled");
    expect(state.rows[0]?.tracking_number).toBe("9400111899223344556677");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("persists tracking from Printify poll even when status is unchanged", async () => {
    const state: DbState = {
      rows: [printOrderRow({ status: "in_production" })],
      lastSync: null,
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

    expect(result).toEqual({ polled: 1, updated: 1, errors: 0 });
    expect(state.rows[0]?.status).toBe("in_production");
    expect(state.rows[0]?.tracking_number).toBe("9400111899223344556677");
    expect(state.lastSync?.updated_at).toBe("2026-05-27T01:05:00.000Z");
  });

  it("records poll errors without mutating the print order", async () => {
    const state: DbState = {
      rows: [printOrderRow()],
      lastSync: null,
    };

    const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));

    const result = await runPrintifyReconcile(
      dbFor(state),
      { PRINTIFY_API_TOKEN: "token", PRINTIFY_SHOP_ID: "99" },
      { now: "2026-05-27T01:10:00.000Z", fetchImpl }
    );

    expect(result).toEqual({ polled: 1, updated: 0, errors: 1 });
    expect(state.lastSync).toBeNull();
    expect(state.rows[0]?.status).toBe("in_production");
    expect(state.rows[0]?.last_reconciled_at).toBeNull();
  });

  it("stamps last_reconciled_at on no-op polls without bumping updated_at", async () => {
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

    expect(result).toEqual({ polled: 1, updated: 0, errors: 0 });
    expect(state.rows[0]?.last_reconciled_at).toBe("2026-05-27T01:15:00.000Z");
    expect(state.rows[0]?.updated_at).toBe("2026-05-27T00:30:00.000Z");
    expect(state.lastSync?.updated_at).toBe("2026-05-27T00:30:00.000Z");
  });
});
