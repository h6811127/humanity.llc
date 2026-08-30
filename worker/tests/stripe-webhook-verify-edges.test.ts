import { describe, expect, it } from "vitest";

import {
  parseStripeSignatureHeader,
  verifyStripeWebhookSignature,
} from "../src/http/stripe-webhook-verify";

const SECRET = "whsec_test_secret";
const PAYLOAD = '{"id":"evt_edge"}';
const TIMESTAMP = 1_492_774_577;

async function signStripePayload(
  secret: string,
  payload: string,
  timestamp: number
): Promise<string> {
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
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("parseStripeSignatureHeader edges", () => {
  it("returns null for missing, empty, and whitespace-only headers", () => {
    expect(parseStripeSignatureHeader(null)).toBeNull();
    expect(parseStripeSignatureHeader("")).toBeNull();
    expect(parseStripeSignatureHeader("   ")).toBeNull();
  });

  it("returns null when timestamp is missing, zero, or non-numeric", () => {
    expect(parseStripeSignatureHeader("v1=5257a869e7")).toBeNull();
    expect(parseStripeSignatureHeader("t=0,v1=5257a869e7")).toBeNull();
    expect(parseStripeSignatureHeader("t=abc,v1=5257a869e7")).toBeNull();
  });

  it("returns null when no v1 signature is present", () => {
    expect(parseStripeSignatureHeader("t=1492774577")).toBeNull();
    expect(parseStripeSignatureHeader("t=1492774577,v0=legacy")).toBeNull();
  });

  it("collects multiple v1 signatures and ignores v0", () => {
    const parsed = parseStripeSignatureHeader(
      "t=1492774577,v1=aaa,v0=ignored,v1=bbb"
    );
    expect(parsed).toEqual({
      timestamp: 1492774577,
      signatures: ["aaa", "bbb"],
    });
  });

  it("trims keys and values and keeps the last finite timestamp", () => {
    const parsed = parseStripeSignatureHeader(
      " t = 111 , t = 1492774577 , v1 = 5257a869e7 "
    );
    expect(parsed).toEqual({
      timestamp: 1492774577,
      signatures: ["5257a869e7"],
    });
  });
});

describe("verifyStripeWebhookSignature edges", () => {
  it("rejects a blank secret before inspecting the header", async () => {
    expect(await verifyStripeWebhookSignature(PAYLOAD, "t=1,v1=abc", "")).toBe(
      "invalid_signature"
    );
    expect(await verifyStripeWebhookSignature(PAYLOAD, "t=1,v1=abc", "   ")).toBe(
      "invalid_signature"
    );
  });

  it("distinguishes missing vs malformed headers", async () => {
    expect(await verifyStripeWebhookSignature(PAYLOAD, null, SECRET)).toBe(
      "missing_header"
    );
    expect(await verifyStripeWebhookSignature(PAYLOAD, "", SECRET)).toBe(
      "missing_header"
    );
    expect(await verifyStripeWebhookSignature(PAYLOAD, "   ", SECRET)).toBe(
      "invalid_header"
    );
    expect(await verifyStripeWebhookSignature(PAYLOAD, "v1=abc", SECRET)).toBe(
      "invalid_header"
    );
  });

  it("accepts a timestamp exactly at the tolerance boundary", async () => {
    const hex = await signStripePayload(SECRET, PAYLOAD, TIMESTAMP);
    const err = await verifyStripeWebhookSignature(
      PAYLOAD,
      `t=${TIMESTAMP},v1=${hex}`,
      SECRET,
      300,
      TIMESTAMP + 300
    );
    expect(err).toBeNull();
  });

  it("rejects a valid-looking header whose HMAC does not match the payload", async () => {
    const hex = await signStripePayload(SECRET, PAYLOAD, TIMESTAMP);
    const err = await verifyStripeWebhookSignature(
      '{"id":"evt_tampered"}',
      `t=${TIMESTAMP},v1=${hex}`,
      SECRET,
      300,
      TIMESTAMP
    );
    expect(err).toBe("invalid_signature");
  });

  it("accepts when one of several v1 signatures matches", async () => {
    const hex = await signStripePayload(SECRET, PAYLOAD, TIMESTAMP);
    const err = await verifyStripeWebhookSignature(
      PAYLOAD,
      `t=${TIMESTAMP},v1=00aa,v1=${hex}`,
      SECRET,
      300,
      TIMESTAMP
    );
    expect(err).toBeNull();
  });

  it("rejects a length-mismatched v1 hex without treating it as a match", async () => {
    const hex = await signStripePayload(SECRET, PAYLOAD, TIMESTAMP);
    const err = await verifyStripeWebhookSignature(
      PAYLOAD,
      `t=${TIMESTAMP},v1=${hex.slice(0, 8)}`,
      SECRET,
      300,
      TIMESTAMP
    );
    expect(err).toBe("invalid_signature");
  });
});
