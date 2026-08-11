import { describe, expect, it } from "vitest";

import { hashBuyerEmail, normalizeBuyerEmail } from "../src/commerce/buyer-email-hash";

describe("normalizeBuyerEmail", () => {
  it("trims and lowercases valid emails", () => {
    expect(normalizeBuyerEmail("  Buyer@Example.COM ")).toBe("buyer@example.com");
  });

  it("rejects empty, whitespace-only, and missing-@ values", () => {
    expect(normalizeBuyerEmail("")).toBeNull();
    expect(normalizeBuyerEmail("   ")).toBeNull();
    expect(normalizeBuyerEmail("not-an-email")).toBeNull();
  });
});

describe("hashBuyerEmail", () => {
  it("hashes the normalized form so case/whitespace variants collide", async () => {
    const a = await hashBuyerEmail("Buyer@Example.COM");
    const b = await hashBuyerEmail("  buyer@example.com ");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });

  it("is deterministic and distinct for different mailboxes", async () => {
    const a = await hashBuyerEmail("a@example.com");
    const b = await hashBuyerEmail("b@example.com");
    expect(a).toBe(await hashBuyerEmail("a@example.com"));
    expect(a).not.toBe(b);
  });

  it("throws on invalid email instead of hashing plaintext garbage", async () => {
    await expect(hashBuyerEmail("not-an-email")).rejects.toThrow(/invalid email/i);
    await expect(hashBuyerEmail("")).rejects.toThrow(/invalid email/i);
  });
});
