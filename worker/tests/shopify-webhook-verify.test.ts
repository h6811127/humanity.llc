import { describe, expect, it } from "vitest";

import { verifyShopifyWebhookHmac } from "../src/http/shopify-webhook-verify";

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

describe("verifyShopifyWebhookHmac", () => {
  it("accepts a valid HMAC", async () => {
    const secret = "shpss_test_secret";
    const payload = '{"id":12345}';
    const hmac = await signShopifyPayload(secret, payload);
    expect(await verifyShopifyWebhookHmac(payload, hmac, secret)).toBeNull();
  });

  it("rejects missing header", async () => {
    expect(await verifyShopifyWebhookHmac("{}", null, "secret")).toBe("missing_header");
  });

  it("rejects invalid signature", async () => {
    expect(await verifyShopifyWebhookHmac("{}", "bad", "secret")).toBe("invalid_signature");
  });
});
