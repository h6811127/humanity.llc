import { describe, expect, it } from "vitest";

import { resolvePrintifyShippingForSubmit } from "../src/commerce/resolve-printify-shipping";
import { upsertEncryptedShippingAddress } from "../src/db/commerce-fulfillment-pii";
import type { PrintifyShippingAddress } from "../src/print/printify-shipping";

const TEST_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xcd)));
const COMMERCE = "co_resolveShipping01";

const BODY_ADDRESS: PrintifyShippingAddress = {
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

const STORED_ADDRESS: PrintifyShippingAddress = {
  first_name: "River",
  last_name: "Example",
  email: "river@example.com",
  phone: "",
  country: "US",
  region: "CA",
  address1: "456 Oak Ave",
  address2: "",
  city: "Oakland",
  zip: "94607",
};

type PiiRow = {
  commerce_order_id: string;
  shipping_iv_b64: string;
  shipping_ciphertext_b64: string;
};

function dbFor(rows: Map<string, PiiRow>): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM commerce_fulfillment_pii")) {
            return rows.get(args[0] as string) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO commerce_fulfillment_pii")) {
            rows.set(args[0] as string, {
              commerce_order_id: args[0] as string,
              shipping_iv_b64: args[1] as string,
              shipping_ciphertext_b64: args[2] as string,
            });
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("resolvePrintifyShippingForSubmit", () => {
  it("prefers explicit request body over encrypted store", async () => {
    const rows = new Map<string, PiiRow>();
    const db = dbFor(rows);
    const env = { FULFILLMENT_PII_ENCRYPTION_KEY: TEST_KEY };

    await upsertEncryptedShippingAddress(db, env, {
      commerce_order_id: COMMERCE,
      shipping_address: STORED_ADDRESS,
      now_iso: "2026-05-27T12:00:00Z",
    });

    const resolved = await resolvePrintifyShippingForSubmit(env, db, COMMERCE, BODY_ADDRESS);
    expect(resolved).toEqual({ address: BODY_ADDRESS, source: "request_body" });
  });

  it("loads encrypted shipping when body omitted", async () => {
    const rows = new Map<string, PiiRow>();
    const db = dbFor(rows);
    const env = { FULFILLMENT_PII_ENCRYPTION_KEY: TEST_KEY };

    await upsertEncryptedShippingAddress(db, env, {
      commerce_order_id: COMMERCE,
      shipping_address: STORED_ADDRESS,
      now_iso: "2026-05-27T12:00:00Z",
    });

    const resolved = await resolvePrintifyShippingForSubmit(env, db, COMMERCE, undefined);
    expect(resolved).toEqual({ address: STORED_ADDRESS, source: "encrypted_store" });
  });

  it("returns null when neither body nor store has shipping", async () => {
    const resolved = await resolvePrintifyShippingForSubmit(
      { FULFILLMENT_PII_ENCRYPTION_KEY: TEST_KEY },
      dbFor(new Map()),
      COMMERCE,
      null
    );
    expect(resolved).toBeNull();
  });
});
