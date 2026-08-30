import { describe, expect, it } from "vitest";

import { verifyShopifyWebhookHmac } from "../src/http/shopify-webhook-verify";

const SECRET = "shpss_test_secret";
const PAYLOAD = '{"id":12345}';

async function signShopifyPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe("verifyShopifyWebhookHmac edges", () => {
  it("rejects a blank secret even when the header is present", async () => {
    const hmac = await signShopifyPayload(SECRET, PAYLOAD);
    expect(await verifyShopifyWebhookHmac(PAYLOAD, hmac, "")).toBe("invalid_signature");
    expect(await verifyShopifyWebhookHmac(PAYLOAD, hmac, "   ")).toBe(
      "invalid_signature"
    );
  });

  it("treats empty and whitespace-only headers as missing", async () => {
    expect(await verifyShopifyWebhookHmac(PAYLOAD, "", SECRET)).toBe("missing_header");
    expect(await verifyShopifyWebhookHmac(PAYLOAD, "   ", SECRET)).toBe(
      "missing_header"
    );
  });

  it("accepts a valid HMAC with surrounding whitespace", async () => {
    const hmac = await signShopifyPayload(SECRET, PAYLOAD);
    expect(await verifyShopifyWebhookHmac(PAYLOAD, `  ${hmac}  `, SECRET)).toBeNull();
  });

  it("rejects a signature computed for a different payload or secret", async () => {
    const hmac = await signShopifyPayload(SECRET, PAYLOAD);
    expect(await verifyShopifyWebhookHmac('{"id":999}', hmac, SECRET)).toBe(
      "invalid_signature"
    );
    expect(await verifyShopifyWebhookHmac(PAYLOAD, hmac, "other_secret")).toBe(
      "invalid_signature"
    );
  });

  it("rejects a truncated HMAC without treating length mismatch as a match", async () => {
    const hmac = await signShopifyPayload(SECRET, PAYLOAD);
    expect(await verifyShopifyWebhookHmac(PAYLOAD, hmac.slice(0, 8), SECRET)).toBe(
      "invalid_signature"
    );
  });
});
