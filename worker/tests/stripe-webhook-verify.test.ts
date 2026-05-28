import { describe, expect, it } from "vitest";

import {
  parseStripeSignatureHeader,
  verifyStripeWebhookSignature,
} from "../src/http/stripe-webhook-verify";

describe("parseStripeSignatureHeader", () => {
  it("parses timestamp and v1 signatures", () => {
    const parsed = parseStripeSignatureHeader("t=1492774577,v1=5257a869e7");
    expect(parsed?.timestamp).toBe(1492774577);
    expect(parsed?.signatures).toEqual(["5257a869e7"]);
  });
});

describe("verifyStripeWebhookSignature", () => {
  it("accepts a valid signature", async () => {
    const secret = "whsec_test_secret";
    const payload = '{"id":"evt_test"}';
    const timestamp = 1_492_774_577;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`)
    );
    const hex = [...new Uint8Array(sig)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const err = await verifyStripeWebhookSignature(
      payload,
      `t=${timestamp},v1=${hex}`,
      secret,
      300,
      timestamp
    );
    expect(err).toBeNull();
  });

  it("rejects timestamp skew", async () => {
    const err = await verifyStripeWebhookSignature(
      "{}",
      "t=1,v1=abc",
      "whsec_x",
      300,
      9_999_999
    );
    expect(err).toBe("timestamp_skew");
  });
});
