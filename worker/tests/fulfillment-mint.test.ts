import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { mintPrintOrderFromCredentials } from "../src/commerce/fulfillment-mint";
import type { PrintOrderRow } from "../src/db/print-orders";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PA = "pa_test_stk_919";
const CREATED = "2026-05-16T17:00:00.000Z";

function printOrderRow(): PrintOrderRow {
  return {
    order_id: "po_fulfillMintTest01",
    profile_id: PROFILE,
    print_artifact_ids_json: JSON.stringify([PA]),
    planned_item_qr_ids_json: JSON.stringify([QR]),
    commerce_order_id: "co_testCommerce1234",
    shopify_order_id: "450789469",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function issueMockDb(publicKeyBase58: string) {
  const inserted: { qr_id: string; print_artifact_id: string }[] = [];
  const activeByPa = new Map<string, string>();

  return {
    db: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
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
              inserted.push({
                qr_id: args[0] as string,
                print_artifact_id: args[3] as string,
              });
              activeByPa.set(args[3] as string, args[0] as string);
              return { success: true };
            }
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database,
    inserted,
  };
}

async function signedCredential(publicKeyBase58: string, privateKey: Uint8Array) {
  const payload = `https://humanity.llc/c/${PROFILE}?q=${QR}`;
  return signDocument(
    withProtocolFields(
      {
        qr_id: QR,
        profile_id: PROFILE,
        nonce: "nonce_fulfillMint01",
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

describe("fulfillment mint (print order batch)", () => {
  it("mints all planned owner-signed QRs for a print order", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { db, inserted } = issueMockDb(publicKeyBase58);
    const credential = await signedCredential(publicKeyBase58, privateKey);

    const result = await mintPrintOrderFromCredentials(
      new Request("https://humanity.llc/v1/print/orders/po_test/mint"),
      db,
      printOrderRow(),
      [credential]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.all_planned_minted).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.minted[0]?.qr_id).toBe(QR);
    expect(inserted).toHaveLength(1);
  });

  it("rejects credentials that do not match the print order plan", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { db } = issueMockDb(publicKeyBase58);
    const credential = await signedCredential(publicKeyBase58, privateKey);

    const wrongPlan = {
      ...printOrderRow(),
      planned_item_qr_ids_json: JSON.stringify(["qr_wrongPlannedQr1"]),
    };

    const result = await mintPrintOrderFromCredentials(
      new Request("https://humanity.llc/v1/print/orders/po_test/mint"),
      db,
      wrongPlan,
      [credential]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.all_planned_minted).toBe(false);
    expect(result.failures[0]?.code).toBe("PLANNED_QR_MISMATCH");
  });
});
