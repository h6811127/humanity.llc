import { describe, expect, it } from "vitest";

import {
  parseRevocationDisplayFields,
  publicReasonLabel,
  type RevocationPublicReason,
} from "../src/resolver/revocation-display";

describe("parseRevocationDisplayFields", () => {
  it("defaults to minimal display and null public reason when both fields are omitted", () => {
    expect(parseRevocationDisplayFields({})).toEqual({
      ok: true,
      meta: { display_mode: "minimal", public_reason: null },
    });
  });

  it("treats explicit null fields as omitted defaults", () => {
    expect(
      parseRevocationDisplayFields({
        display_mode: null,
        public_reason: null,
      })
    ).toEqual({
      ok: true,
      meta: { display_mode: "minimal", public_reason: null },
    });
  });

  it("accepts each allowed display_mode", () => {
    for (const display_mode of ["minimal", "tombstone", "private"] as const) {
      expect(parseRevocationDisplayFields({ display_mode })).toEqual({
        ok: true,
        meta: { display_mode, public_reason: null },
      });
    }
  });

  it("accepts each allowed public_reason", () => {
    const reasons: RevocationPublicReason[] = [
      "event_ended",
      "rotated",
      "lost_item",
      "owner_revoked",
      "compromised",
      "other",
    ];
    for (const public_reason of reasons) {
      expect(parseRevocationDisplayFields({ public_reason })).toEqual({
        ok: true,
        meta: { display_mode: "minimal", public_reason },
      });
    }
  });

  it("rejects unknown or non-string display_mode", () => {
    expect(parseRevocationDisplayFields({ display_mode: "hidden" })).toEqual({
      ok: false,
      message: "display_mode must be minimal, tombstone, or private.",
    });
    expect(parseRevocationDisplayFields({ display_mode: 1 })).toEqual({
      ok: false,
      message: "display_mode must be minimal, tombstone, or private.",
    });
  });

  it("rejects unknown or non-string public_reason", () => {
    expect(parseRevocationDisplayFields({ public_reason: "spam" })).toEqual({
      ok: false,
      message:
        "public_reason must be event_ended, rotated, lost_item, owner_revoked, compromised, or other.",
    });
    expect(parseRevocationDisplayFields({ public_reason: ["lost_item"] })).toEqual({
      ok: false,
      message:
        "public_reason must be event_ended, rotated, lost_item, owner_revoked, compromised, or other.",
    });
  });
});

describe("publicReasonLabel", () => {
  it("maps each public reason to scan copy", () => {
    expect(publicReasonLabel("event_ended")).toBe("Event ended");
    expect(publicReasonLabel("rotated")).toBe("QR rotated");
    expect(publicReasonLabel("lost_item")).toBe("Lost item recovered or closed");
    expect(publicReasonLabel("owner_revoked")).toBe("Revoked by owner");
    expect(publicReasonLabel("compromised")).toBe("Compromised or abused");
    expect(publicReasonLabel("other")).toBe("Owner revoked");
  });

  it("returns null for missing or unknown reasons", () => {
    expect(publicReasonLabel(null)).toBeNull();
    expect(publicReasonLabel(undefined)).toBeNull();
    expect(publicReasonLabel("")).toBeNull();
    expect(publicReasonLabel("spam")).toBeNull();
  });
});
