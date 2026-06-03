import { describe, expect, it } from "vitest";

import {
  LOST_ITEM_OFFER_MESSAGE_MAX,
  LOST_ITEM_OFFER_PENDING_MAX,
  LOST_ITEM_OFFER_TTL_MS,
  lostItemOfferExpiresAt,
  lostItemOfferPublicPayload,
  normalizeLostItemOfferMessage,
} from "../src/live-object/lost-item-offer-core";

describe("lost-item-offer-core", () => {
  it("normalizes non-empty trimmed messages up to max length", () => {
    expect(normalizeLostItemOfferMessage("  Found near the river  ")).toBe(
      "Found near the river"
    );
    expect(normalizeLostItemOfferMessage("x".repeat(LOST_ITEM_OFFER_MESSAGE_MAX))).toBe(
      "x".repeat(LOST_ITEM_OFFER_MESSAGE_MAX)
    );
  });

  it("rejects empty, non-string, and over-length messages", () => {
    expect(normalizeLostItemOfferMessage("")).toBeNull();
    expect(normalizeLostItemOfferMessage("   ")).toBeNull();
    expect(normalizeLostItemOfferMessage(null)).toBeNull();
    expect(normalizeLostItemOfferMessage(42)).toBeNull();
    expect(
      normalizeLostItemOfferMessage("x".repeat(LOST_ITEM_OFFER_MESSAGE_MAX + 1))
    ).toBeNull();
  });

  it("computes offer expiry from TTL", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(lostItemOfferExpiresAt(now)).toBe(
      new Date(now.getTime() + LOST_ITEM_OFFER_TTL_MS).toISOString()
    );
  });

  it("exports public owner list payload without qr_id", () => {
    const payload = lostItemOfferPublicPayload({
      offer_id: "ro_7Xk9mP2nQ4rT6vW8yZ1aB3",
      parent_profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      object_id: "obj_lost_item_relay01",
      qr_id: "qr_secret_scanner",
      message: "Found at the library desk",
      status: "pending",
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2026-07-01T12:00:00.000Z",
    });
    expect(payload).toEqual({
      offer_id: "ro_7Xk9mP2nQ4rT6vW8yZ1aB3",
      object_id: "obj_lost_item_relay01",
      message: "Found at the library desk",
      status: "pending",
      created_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2026-07-01T12:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("qr_id");
  });

  it("documents pending cap constant", () => {
    expect(LOST_ITEM_OFFER_PENDING_MAX).toBe(20);
  });
});
