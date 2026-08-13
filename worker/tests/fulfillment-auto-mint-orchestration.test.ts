import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  tryAutoMintPrintOrderFromIntents,
  tryAutoMintQueuedPrintOrders,
} from "../src/commerce/fulfillment-auto-mint";
import * as fulfillmentMint from "../src/commerce/fulfillment-mint";
import * as artifactIntents from "../src/db/artifact-intents";
import * as printOrders from "../src/db/print-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import type { Env } from "../src/env";
import * as printifySubmit from "../src/print/print-order-printify-submit";

const PRINT_ORDER = "po_autoMintOrch01";
const INTENT = "ai_autoMintOrch01";

function printOrderRow(): PrintOrderRow {
  return {
    order_id: PRINT_ORDER,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: '["pa_testPreMintAuto919"]',
    planned_item_qr_ids_json: '["qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG"]',
    commerce_order_id: "co_autoMintOrch01",
    shopify_order_id: "450789473",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00.000Z",
    updated_at: "2026-05-16T17:00:00.000Z",
  };
}

function request(): Request {
  return new Request("https://humanity.llc/v1/webhooks/shopify/orders");
}

function env(enabled = false): Env {
  return { PRINTIFY_SUBMIT_ENABLED: enabled ? "1" : "0" } as Env;
}

describe("tryAutoMintPrintOrderFromIntents", () => {
  beforeEach(() => {
    vi.spyOn(printOrders, "getPrintOrderById").mockResolvedValue(printOrderRow());
    vi.spyOn(artifactIntents, "getArtifactIntent").mockResolvedValue(null);
    vi.spyOn(fulfillmentMint, "allPlannedQrsMinted").mockResolvedValue(false);
    vi.spyOn(fulfillmentMint, "mintPrintOrderFromCredentials").mockResolvedValue({
      ok: true,
      minted: [],
      failures: [],
      all_planned_minted: true,
    });
    vi.spyOn(printifySubmit, "submitPrintOrderToPrintify").mockResolvedValue({
      ok: true,
      printOrder: printOrderRow(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a null print order id when the row is missing", async () => {
    vi.spyOn(printOrders, "getPrintOrderById").mockResolvedValue(null);
    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );
    expect(result).toEqual({
      attempted: false,
      all_planned_minted: false,
      print_order_id: null,
      minted_count: 0,
      failure_count: 0,
      printify_submit: { attempted: false, submitted: false, skipped: true },
    });
    expect(fulfillmentMint.mintPrintOrderFromCredentials).not.toHaveBeenCalled();
  });

  it("does not submit Printify when credentials are empty and QRs are not minted", async () => {
    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(true),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );
    expect(result.attempted).toBe(false);
    expect(result.all_planned_minted).toBe(false);
    expect(result.printify_submit.skipped).toBe(true);
    expect(printifySubmit.submitPrintOrderToPrintify).not.toHaveBeenCalled();
  });

  it("submits Printify when credentials are empty but planned QRs are already minted", async () => {
    vi.spyOn(fulfillmentMint, "allPlannedQrsMinted").mockResolvedValue(true);
    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(true),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );
    expect(result.attempted).toBe(false);
    expect(result.all_planned_minted).toBe(true);
    expect(result.printify_submit).toEqual({
      attempted: true,
      submitted: true,
      skipped: false,
    });
  });

  it("records a mint attempt without submitting when mint fails", async () => {
    vi.spyOn(artifactIntents, "getArtifactIntent").mockResolvedValue({
      artifact_intent_id: INTENT,
      pending_mint_credentials_json: JSON.stringify([{ qr_id: "qr_one" }]),
    } as Awaited<ReturnType<typeof artifactIntents.getArtifactIntent>>);
    vi.spyOn(fulfillmentMint, "mintPrintOrderFromCredentials").mockResolvedValue({
      ok: false,
      code: "PLANNED_QR_COUNT_MISMATCH",
      message: "count mismatch",
      httpStatus: 422,
    });

    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(true),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );

    expect(result).toMatchObject({
      attempted: true,
      print_order_id: PRINT_ORDER,
      minted_count: 0,
      failure_count: 1,
      printify_submit: { attempted: false, submitted: false, skipped: true },
    });
    expect(printifySubmit.submitPrintOrderToPrintify).not.toHaveBeenCalled();
  });

  it("does not submit Printify when mint succeeds but planned QRs remain", async () => {
    vi.spyOn(artifactIntents, "getArtifactIntent").mockResolvedValue({
      artifact_intent_id: INTENT,
      pending_mint_credentials_json: JSON.stringify([{ qr_id: "qr_one" }]),
    } as Awaited<ReturnType<typeof artifactIntents.getArtifactIntent>>);
    vi.spyOn(fulfillmentMint, "mintPrintOrderFromCredentials").mockResolvedValue({
      ok: true,
      minted: [{ qr_id: "qr_one" } as never],
      failures: [{ index: 1, qr_id: "qr_two", print_artifact_id: "pa", code: "X", message: "x" }],
      all_planned_minted: false,
    });

    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(true),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );

    expect(result.attempted).toBe(true);
    expect(result.all_planned_minted).toBe(false);
    expect(result.minted_count).toBe(1);
    expect(result.failure_count).toBe(1);
    expect(result.printify_submit.skipped).toBe(true);
    expect(printifySubmit.submitPrintOrderToPrintify).not.toHaveBeenCalled();
  });

  it("submits Printify after a complete mint", async () => {
    vi.spyOn(artifactIntents, "getArtifactIntent").mockResolvedValue({
      artifact_intent_id: INTENT,
      pending_mint_credentials_json: JSON.stringify([{ qr_id: "qr_one" }]),
    } as Awaited<ReturnType<typeof artifactIntents.getArtifactIntent>>);
    vi.spyOn(fulfillmentMint, "mintPrintOrderFromCredentials").mockResolvedValue({
      ok: true,
      minted: [{ qr_id: "qr_one" } as never],
      failures: [],
      all_planned_minted: true,
    });

    const result = await tryAutoMintPrintOrderFromIntents(
      request(),
      env(true),
      {} as D1Database,
      PRINT_ORDER,
      [INTENT]
    );

    expect(result).toMatchObject({
      attempted: true,
      all_planned_minted: true,
      print_order_id: PRINT_ORDER,
      minted_count: 1,
      failure_count: 0,
    });
    expect(result.printify_submit.submitted).toBe(true);
  });
});

describe("tryAutoMintQueuedPrintOrders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns one result per queued print order id", async () => {
    vi.spyOn(printOrders, "getPrintOrderById").mockResolvedValue(null);
    const results = await tryAutoMintQueuedPrintOrders(
      request(),
      env(),
      {} as D1Database,
      ["po_missing_a", "po_missing_b"],
      [INTENT]
    );
    expect(results).toHaveLength(2);
    expect(results.every((row) => row.print_order_id === null)).toBe(true);
  });
});
