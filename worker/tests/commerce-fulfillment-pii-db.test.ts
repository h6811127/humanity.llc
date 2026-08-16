import { describe, expect, it } from "vitest";

import {
  loadEncryptedShippingAddress,
  upsertEncryptedShippingAddress,
} from "../src/db/commerce-fulfillment-pii";
import type { PrintifyShippingAddress } from "../src/print/printify-shipping";

const ORDER_A = "co_fulfillPiiAa919";
const ORDER_B = "co_fulfillPiiBb818";
const NOW = "2026-08-16T10:00:00.000Z";
const LATER = "2026-08-16T11:00:00.000Z";

function testKeyB64(seed = 0xcd): string {
  const bytes = new Uint8Array(32);
  bytes.fill(seed);
  return btoa(String.fromCharCode(...bytes));
}

const ADDRESS_A: PrintifyShippingAddress = {
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

const ADDRESS_B: PrintifyShippingAddress = {
  first_name: "River",
  last_name: "Example",
  email: "river@example.com",
  phone: "",
  country: "US",
  region: "CA",
  address1: "456 Oak Ave",
  address2: "Unit 2",
  city: "Oakland",
  zip: "94607",
};

type PiiRow = {
  commerce_order_id: string;
  shipping_iv_b64: string;
  shipping_ciphertext_b64: string;
  created_at: string;
  updated_at: string;
};

class FakeFulfillmentPiiDb {
  rows = new Map<string, PiiRow>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM commerce_fulfillment_pii WHERE commerce_order_id = ?")) {
              return (self.rows.get(String(args[0])) ?? null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO commerce_fulfillment_pii")) {
              const commerceOrderId = String(args[0]);
              const existing = self.rows.get(commerceOrderId);
              self.rows.set(commerceOrderId, {
                commerce_order_id: commerceOrderId,
                shipping_iv_b64: String(args[1]),
                shipping_ciphertext_b64: String(args[2]),
                created_at: existing?.created_at ?? String(args[3]),
                updated_at: String(args[4]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeFulfillmentPiiDb): D1Database {
  return fake as unknown as D1Database;
}

describe("commerce fulfillment PII db helpers", () => {
  it("round-trips encrypted shipping and isolates commerce_order_id", async () => {
    const fake = new FakeFulfillmentPiiDb();
    const env = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64() };

    expect(await loadEncryptedShippingAddress(db(fake), env, ORDER_A)).toBeNull();

    expect(
      await upsertEncryptedShippingAddress(db(fake), env, {
        commerce_order_id: ORDER_A,
        shipping_address: ADDRESS_A,
        now_iso: NOW,
      })
    ).toBe(true);
    expect(
      await upsertEncryptedShippingAddress(db(fake), env, {
        commerce_order_id: ORDER_B,
        shipping_address: ADDRESS_B,
        now_iso: NOW,
      })
    ).toBe(true);

    await expect(loadEncryptedShippingAddress(db(fake), env, ORDER_A)).resolves.toEqual(ADDRESS_A);
    await expect(loadEncryptedShippingAddress(db(fake), env, ORDER_B)).resolves.toEqual(ADDRESS_B);
    await expect(
      loadEncryptedShippingAddress(db(fake), env, "co_missingOrder")
    ).resolves.toBeNull();
  });

  it("overwrites ciphertext for the same commerce_order_id", async () => {
    const fake = new FakeFulfillmentPiiDb();
    const env = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64() };

    await upsertEncryptedShippingAddress(db(fake), env, {
      commerce_order_id: ORDER_A,
      shipping_address: ADDRESS_A,
      now_iso: NOW,
    });
    const firstCipher = fake.rows.get(ORDER_A)?.shipping_ciphertext_b64;
    expect(firstCipher).toBeTruthy();

    expect(
      await upsertEncryptedShippingAddress(db(fake), env, {
        commerce_order_id: ORDER_A,
        shipping_address: ADDRESS_B,
        now_iso: LATER,
      })
    ).toBe(true);

    expect(fake.rows.get(ORDER_A)?.updated_at).toBe(LATER);
    expect(fake.rows.get(ORDER_A)?.shipping_ciphertext_b64).not.toBe(firstCipher);
    await expect(loadEncryptedShippingAddress(db(fake), env, ORDER_A)).resolves.toEqual(ADDRESS_B);
  });

  it("returns false and writes nothing when encryption is not configured", async () => {
    const fake = new FakeFulfillmentPiiDb();

    expect(
      await upsertEncryptedShippingAddress(
        db(fake),
        { FULFILLMENT_PII_ENCRYPTION_KEY: "" },
        {
          commerce_order_id: ORDER_A,
          shipping_address: ADDRESS_A,
          now_iso: NOW,
        }
      )
    ).toBe(false);
    expect(fake.rows.size).toBe(0);
    await expect(
      loadEncryptedShippingAddress(
        db(fake),
        { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64() },
        ORDER_A
      )
    ).resolves.toBeNull();
  });

  it("returns null when stored ciphertext cannot be decrypted", async () => {
    const fake = new FakeFulfillmentPiiDb();
    const writeEnv = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64(0x11) };
    const readEnv = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64(0x22) };

    await upsertEncryptedShippingAddress(db(fake), writeEnv, {
      commerce_order_id: ORDER_A,
      shipping_address: ADDRESS_A,
      now_iso: NOW,
    });

    await expect(loadEncryptedShippingAddress(db(fake), readEnv, ORDER_A)).resolves.toBeNull();
  });
});
