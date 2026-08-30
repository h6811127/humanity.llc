import { describe, expect, it } from "vitest";

import { verifyPrintifyWebhookSignature } from "../src/print/printify-webhook-verify";

const SECRET = "printify_webhook_test_secret";
const PAYLOAD = '{"id":"evt_edge"}';

async function signPrintifyPayload(secret: string, payload: string): Promise<string> {
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

describe("verifyPrintifyWebhookSignature edges", () => {
  it("rejects a blank secret even when the header is present", async () => {
    const sig = await signPrintifyPayload(SECRET, PAYLOAD);
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, sig, "")).toBe(
      "invalid_signature"
    );
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, sig, "   ")).toBe(
      "invalid_signature"
    );
  });

  it("treats missing, empty, and whitespace-only headers as missing", async () => {
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, null, SECRET)).toBe(
      "missing_header"
    );
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, "", SECRET)).toBe(
      "missing_header"
    );
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, "   ", SECRET)).toBe(
      "missing_header"
    );
  });

  it("accepts a valid sha256 header with surrounding whitespace", async () => {
    const sig = await signPrintifyPayload(SECRET, PAYLOAD);
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, `  ${sig}  `, SECRET)).toBeNull();
  });

  it("rejects a raw hex digest that is missing the sha256= prefix", async () => {
    const sig = await signPrintifyPayload(SECRET, PAYLOAD);
    expect(await verifyPrintifyWebhookSignature(PAYLOAD, sig.slice("sha256=".length), SECRET)).toBe(
      "invalid_signature"
    );
  });

  it("rejects SHA256= (wrong case) and a signature for a different payload", async () => {
    const sig = await signPrintifyPayload(SECRET, PAYLOAD);
    expect(
      await verifyPrintifyWebhookSignature(PAYLOAD, sig.replace("sha256=", "SHA256="), SECRET)
    ).toBe("invalid_signature");
    expect(await verifyPrintifyWebhookSignature('{"id":"tampered"}', sig, SECRET)).toBe(
      "invalid_signature"
    );
  });
});
