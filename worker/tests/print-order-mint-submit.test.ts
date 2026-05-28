import { describe, expect, it, vi } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import type { Env } from "../src/env";
import { submitPrintOrderToPrintify } from "../src/print/print-order-printify-submit";
import { handlePostPrintOrderMint } from "../src/print/print-orders-handler";
import { TIER0_BATCH_PRINT_TEMPLATE_ID } from "../src/print/print-catalog";

const TOKEN = "operator-mint-submit-token";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PA = "pa_mintSubmitTest919";
const COMMERCE = "co_mintSubmitTest01";
const PRINT_ORDER = "po_mintSubmitTest01";
const CREATED = "2026-05-16T17:00:00.000Z";

const ADDRESS = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  phone: "+15555550123",
  country: "US",
  region: "NY",
  address1: "123 Example St",
  address2: "",
  city: "Brooklyn",
  zip: "11221",
};

function env(): Env {
  return {
    OPERATOR_AUDIT_TOKEN: TOKEN,
    PRINTIFY_API_TOKEN: "token",
    PRINTIFY_SHOP_ID: "99",
    PRINTIFY_SUBMIT_ENABLED: "1",
    TIER0_PRINTIFY_PRODUCT_ID: "prod_tier0",
    TIER0_PRINTIFY_VARIANT_ID: "17887",
  } as Env;
}

function authMintRequest(body: Record<string, unknown>): Request {
  return new Request(`https://humanity.llc/v1/print/orders/${PRINT_ORDER}/mint`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function printOrderRow(): PrintOrderRow {
  return {
    order_id: PRINT_ORDER,
    profile_id: PROFILE,
    print_artifact_ids_json: JSON.stringify([PA]),
    planned_item_qr_ids_json: JSON.stringify([QR]),
    commerce_order_id: COMMERCE,
    shopify_order_id: "450789469",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function commerceOrder(): CommerceOrderRow {
  return {
    commerce_order_id: COMMERCE,
    shopify_order_id: "450789469",
    shopify_checkout_id: "901414060",
    shopify_order_number: 1001,
    buyer_email_hash: null,
    profile_id: PROFILE,
    artifact_intent_ids_json: "[]",
    print_order_ids_json: JSON.stringify([PRINT_ORDER]),
    status: "processing",
    hold_reason: null,
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function dbFor(publicKeyBase58: string, printOrder: PrintOrderRow): D1Database {
  const activeByPa = new Map<string, string>();

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM print_orders WHERE order_id")) {
            return args[0] === PRINT_ORDER ? printOrder : null;
          }
          if (sql.includes("FROM commerce_order_links WHERE commerce_order_id")) {
            return args[0] === COMMERCE ? commerceOrder() : null;
          }
          if (sql.includes("FROM cards WHERE profile_id") && sql.includes("manifesto_line")) {
            return {
              public_key: publicKeyBase58,
              recovery_public_key: null,
              handle: "river_example",
              handle_normalized: "river_example",
              manifesto_line: "Open studio",
              status: "active",
              card_document_json: "{}",
              created_at: CREATED,
              updated_at: CREATED,
            };
          }
          if (sql.includes("issuer_public_key")) {
            return {
              public_key: publicKeyBase58,
              recovery_public_key: null,
              issuer_public_key: null,
              status: "active",
            };
          }
          if (sql.includes("print_artifact_id = ?")) {
            const paId = args[1] as string;
            const qrId = activeByPa.get(paId);
            return qrId ? { qr_id: qrId, print_artifact_id: paId } : null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO qr_credentials")) {
            activeByPa.set(args[3] as string, args[0] as string);
            return { success: true };
          }
          if (sql.includes("UPDATE print_orders SET")) {
            printOrder = {
              ...printOrder,
              status: args[0] as string,
              printify_order_id: args[1] as string,
              printify_shop_id: args[2] as number,
              updated_at: args[3] as string,
            };
            return { success: true };
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

async function signedCredential(publicKeyBase58: string, privateKey: Uint8Array) {
  const payload = `https://humanity.llc/c/${PROFILE}?q=${QR}`;
  return signDocument(
    withProtocolFields(
      {
        qr_id: QR,
        profile_id: PROFILE,
        nonce: "nonce_mintSubmit01",
        epoch: 1,
        scope: "print_artifact",
        print_artifact_id: PA,
        resolver_hint: "https://humanity.llc",
        issued_at: CREATED,
        expires_at: null,
        status: "active",
        payload,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );
}

describe("submitPrintOrderToPrintify", () => {
  it("submits with request body shipping when enabled", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "5a96f649b2439217d070f507" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const printOrder = printOrderRow();
    const db = dbFor("pubkey", printOrder);
    const result = await submitPrintOrderToPrintify(
      new Request("https://humanity.llc/v1/print/orders"),
      env(),
      db,
      printOrder,
      { shipping_address: ADDRESS }
    );

    vi.unstubAllGlobals();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.printOrder.status).toBe("submitted");
    expect(result.printOrder.printify_order_id).toBe("5a96f649b2439217d070f507");
    expect(result.shippingSource).toBe("request_body");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("handlePostPrintOrderMint submit_to_printify", () => {
  it("chains Printify submit after successful mint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "5a96f649b2439217d070f508" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const printOrder = printOrderRow();
    const db = dbFor(publicKeyBase58, printOrder);
    const credential = await signedCredential(publicKeyBase58, privateKey);

    const res = await handlePostPrintOrderMint(
      authMintRequest({
        qr_credentials: [credential],
        submit_to_printify: true,
        shipping_address: ADDRESS,
      }),
      env(),
      db,
      PRINT_ORDER
    );

    vi.unstubAllGlobals();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      all_planned_minted: boolean;
      printify_submit?: { status: string; printify_order_id: string; shipping_source: string };
      print_order_status?: string;
    };
    expect(json.all_planned_minted).toBe(true);
    expect(json.printify_submit?.status).toBe("submitted");
    expect(json.printify_submit?.printify_order_id).toBe("5a96f649b2439217d070f508");
    expect(json.printify_submit?.shipping_source).toBe("request_body");
    expect(json.print_order_status).toBe("submitted");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns 409 when submit_to_printify is set but mint is incomplete", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const printOrder = {
      ...printOrderRow(),
      planned_item_qr_ids_json: JSON.stringify([QR, "qr_secondPlannedQr1"]),
      print_artifact_ids_json: JSON.stringify([PA, "pa_secondPlannedPa1"]),
    };
    const db = dbFor(publicKeyBase58, printOrder);
    const credential = await signedCredential(publicKeyBase58, privateKey);
    const wrongSecond = {
      ...credential,
      qr_id: "qr_secondPlannedQr1",
      print_artifact_id: "pa_wrongSecondPlanned",
    };

    const res = await handlePostPrintOrderMint(
      authMintRequest({
        qr_credentials: [credential, wrongSecond],
        submit_to_printify: true,
        shipping_address: ADDRESS,
      }),
      env(),
      db,
      PRINT_ORDER
    );

    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("PLANNED_QRS_NOT_MINTED");
  });
});
