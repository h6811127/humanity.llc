import { describe, expect, it } from "vitest";

import {
  decryptFulfillmentJson,
  encryptFulfillmentJson,
  fulfillmentPiiEncryptionConfigured,
} from "../src/commerce/fulfillment-pii-crypto";

function testKeyB64(seed = 0xab): string {
  const bytes = new Uint8Array(32);
  bytes.fill(seed);
  return btoa(String.fromCharCode(...bytes));
}

describe("fulfillment-pii-crypto", () => {
  it("detects valid 32-byte base64 key material", () => {
    expect(fulfillmentPiiEncryptionConfigured({ FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64() })).toBe(
      true
    );
    expect(fulfillmentPiiEncryptionConfigured({ FULFILLMENT_PII_ENCRYPTION_KEY: "" })).toBe(false);
    expect(fulfillmentPiiEncryptionConfigured({ FULFILLMENT_PII_ENCRYPTION_KEY: "not-valid" })).toBe(
      false
    );
  });

  it("round-trips JSON through AES-256-GCM", async () => {
    const env = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64() };
    const payload = {
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      country: "US",
    };

    const encrypted = await encryptFulfillmentJson(env, payload);
    expect(encrypted).not.toBeNull();

    const decrypted = await decryptFulfillmentJson<typeof payload>(env, encrypted!);
    expect(decrypted).toEqual(payload);
  });

  it("returns null when decrypting with wrong key", async () => {
    const envA = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64(0x01) };
    const envB = { FULFILLMENT_PII_ENCRYPTION_KEY: testKeyB64(0x02) };
    const encrypted = await encryptFulfillmentJson(envA, { secret: "value" });
    expect(await decryptFulfillmentJson(envB, encrypted!)).toBeNull();
  });
});
