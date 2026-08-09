import { describe, expect, it } from "vitest";

import { verifyPrintifyWebhookSignature } from "../src/print/printify-webhook-verify";

const SECRET = "printify_webhook_verify_secret";

async function signPayload(payload: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("verifyPrintifyWebhookSignature", () => {
  const body = '{"id":"evt_verify_1","type":"order:updated"}';

  it("accepts a valid sha256 signature", async () => {
    const sig = await signPayload(body);
    expect(await verifyPrintifyWebhookSignature(body, sig, SECRET)).toBeNull();
  });

  it("trims whitespace around a valid signature header", async () => {
    const sig = await signPayload(body);
    expect(await verifyPrintifyWebhookSignature(body, `  ${sig}  `, SECRET)).toBeNull();
  });

  it("rejects an empty or whitespace-only secret", async () => {
    const sig = await signPayload(body);
    expect(await verifyPrintifyWebhookSignature(body, sig, "")).toBe("invalid_signature");
    expect(await verifyPrintifyWebhookSignature(body, sig, "   ")).toBe("invalid_signature");
  });

  it("rejects a missing or blank signature header", async () => {
    expect(await verifyPrintifyWebhookSignature(body, null, SECRET)).toBe("missing_header");
    expect(await verifyPrintifyWebhookSignature(body, "", SECRET)).toBe("missing_header");
    expect(await verifyPrintifyWebhookSignature(body, "   ", SECRET)).toBe("missing_header");
  });

  it("rejects a wrong signature without accepting truncated matches", async () => {
    const sig = await signPayload(body);
    expect(await verifyPrintifyWebhookSignature(body, `${sig}ff`, SECRET)).toBe(
      "invalid_signature"
    );
    expect(await verifyPrintifyWebhookSignature(body, sig.slice(0, -2), SECRET)).toBe(
      "invalid_signature"
    );
    expect(
      await verifyPrintifyWebhookSignature(body, await signPayload(body, "other_secret"), SECRET)
    ).toBe("invalid_signature");
  });
});
