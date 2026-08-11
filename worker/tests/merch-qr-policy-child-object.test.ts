import { describe, expect, it } from "vitest";

import {
  isChildObjectQrScope,
  isItemScopedQrScope,
  isPrintArtifactScope,
  isQrCalendarExpired,
  normalizeExpiresAtForScope,
  resolveStoredQrExpiresAt,
  validateItemScopedMintExpiry,
  validatePrintArtifactMintExpiry,
} from "../src/resolver/merch-qr-policy";

describe("merch-qr-policy child_object / item-scoped edges", () => {
  it("classifies print_artifact and child_object as item-scoped", () => {
    expect(isPrintArtifactScope("print_artifact")).toBe(true);
    expect(isChildObjectQrScope("child_object")).toBe(true);
    expect(isItemScopedQrScope("print_artifact")).toBe(true);
    expect(isItemScopedQrScope("child_object")).toBe(true);
    expect(isItemScopedQrScope("card")).toBe(false);
    expect(isItemScopedQrScope(null)).toBe(false);
  });

  it("never calendar-expires child_object even with a past expires_at", () => {
    const past = "2020-01-01T00:00:00Z";
    expect(isQrCalendarExpired("child_object", past)).toBe(false);
    expect(isQrCalendarExpired("print_artifact", past)).toBe(false);
    expect(isQrCalendarExpired("card", past)).toBe(true);
  });

  it("treats unparseable expires_at as not calendar-expired for card scope", () => {
    expect(isQrCalendarExpired("card", "not-a-date")).toBe(false);
    expect(isQrCalendarExpired("card", null)).toBe(false);
  });

  it("clears persisted expiry for child_object the same as print_artifact", () => {
    expect(normalizeExpiresAtForScope("child_object", "2027-01-01T00:00:00Z")).toBeNull();
    expect(normalizeExpiresAtForScope("child_object", "")).toBeNull();
    expect(normalizeExpiresAtForScope("card", "")).toBeNull();
  });

  it("rejects mint-time calendar expiry on child_object with ITEM_SCOPED_NO_CALENDAR_EXPIRY", () => {
    const rejected = validateItemScopedMintExpiry("child_object", "2027-01-01");
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.code).toBe("ITEM_SCOPED_NO_CALENDAR_EXPIRY");
      expect(rejected.message).toMatch(/child_object/);
    }

    expect(validateItemScopedMintExpiry("child_object", null).ok).toBe(true);
    expect(validateItemScopedMintExpiry("child_object", "").ok).toBe(true);
    expect(validatePrintArtifactMintExpiry("child_object", "2027-01-01").ok).toBe(false);
  });

  it("resolveStoredQrExpiresAt forces null for child_object and keeps Tier 0 card null", () => {
    const defaultExpiry = () => "2027-01-01T00:00:00.000Z";
    expect(resolveStoredQrExpiresAt("child_object", "2028-01-01T00:00:00.000Z", defaultExpiry)).toBeNull();
    expect(resolveStoredQrExpiresAt("child_object", undefined, defaultExpiry)).toBeNull();
    expect(resolveStoredQrExpiresAt("card", null, defaultExpiry)).toBeNull();
    expect(resolveStoredQrExpiresAt("card", "", defaultExpiry)).toBe("2027-01-01T00:00:00.000Z");
  });
});
