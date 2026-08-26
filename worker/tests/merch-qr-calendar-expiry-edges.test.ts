import { describe, expect, it } from "vitest";

import {
  isQrCalendarExpired,
  normalizeExpiresAtForScope,
  resolveStoredQrExpiresAt,
  validateItemScopedMintExpiry,
} from "../src/resolver/merch-qr-policy";

describe("isQrCalendarExpired edges", () => {
  it("treats card-scope expiry as inclusive at the instant", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    expect(isQrCalendarExpired("card", now.toISOString(), now)).toBe(true);
    expect(
      isQrCalendarExpired("card", new Date(now.getTime() - 1).toISOString(), now)
    ).toBe(true);
    expect(
      isQrCalendarExpired("card", new Date(now.getTime() + 1).toISOString(), now)
    ).toBe(false);
  });

  it("ignores missing or unparseable expiry on card scope", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    expect(isQrCalendarExpired("card", null, now)).toBe(false);
    expect(isQrCalendarExpired("card", "", now)).toBe(false);
    expect(isQrCalendarExpired("card", "not-an-instant", now)).toBe(false);
    expect(isQrCalendarExpired(null, "2020-01-01T00:00:00.000Z", now)).toBe(true);
  });

  it("never calendar-expires item-scoped QRs", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    expect(isQrCalendarExpired("print_artifact", "2020-01-01T00:00:00.000Z", now)).toBe(
      false
    );
    expect(isQrCalendarExpired("child_object", now.toISOString(), now)).toBe(false);
  });
});

describe("item-scoped expiry persist and mint gates", () => {
  it("clears empty and item-scoped stored expiry", () => {
    expect(normalizeExpiresAtForScope("card", "")).toBeNull();
    expect(normalizeExpiresAtForScope("card", null)).toBeNull();
    expect(normalizeExpiresAtForScope("child_object", "2027-01-01T00:00:00.000Z")).toBeNull();
    expect(normalizeExpiresAtForScope("print_artifact", "2027-01-01T00:00:00.000Z")).toBeNull();
  });

  it("rejects mint expiry on child_object with the item-scoped code", () => {
    expect(validateItemScopedMintExpiry("card", "2027-01-01").ok).toBe(true);
    expect(validateItemScopedMintExpiry("child_object", null).ok).toBe(true);
    expect(validateItemScopedMintExpiry("child_object", "")).toEqual({ ok: true });
    expect(validateItemScopedMintExpiry("child_object", "2027-01-01")).toEqual({
      ok: false,
      code: "ITEM_SCOPED_NO_CALENDAR_EXPIRY",
      message: "child_object credentials must not set expires_at.",
    });
    expect(validateItemScopedMintExpiry("print_artifact", "2027-01-01")).toEqual({
      ok: false,
      code: "ITEM_SCOPED_NO_CALENDAR_EXPIRY",
      message: "print_artifact credentials must not set expires_at.",
    });
  });

  it("uses default expiry only for non-null, non-empty card-scope values", () => {
    const fallback = () => "2027-01-01T00:00:00.000Z";
    expect(resolveStoredQrExpiresAt("card", "", fallback)).toBe(fallback());
    expect(resolveStoredQrExpiresAt("child_object", "2028-01-01", fallback)).toBeNull();
  });
});
