import { describe, expect, it } from "vitest";

import {
  PROOF_DISPLAY_TTL_MS,
  isLiveControlProofFresh,
  liveControlProofExpiresAt,
} from "../src/resolver/live-control";

const PROVEN_AT = "2026-08-20T12:00:00.000Z";
const PROVEN_AT_MS = Date.parse(PROVEN_AT);

describe("liveControlProofExpiresAt", () => {
  it("returns null for missing or unparseable proven_at", () => {
    expect(liveControlProofExpiresAt(null)).toBeNull();
    expect(liveControlProofExpiresAt("")).toBeNull();
    expect(liveControlProofExpiresAt("not-a-date")).toBeNull();
  });

  it("adds the five-minute display TTL", () => {
    expect(PROOF_DISPLAY_TTL_MS).toBe(5 * 60_000);
    expect(liveControlProofExpiresAt(PROVEN_AT)).toBe("2026-08-20T12:05:00.000Z");
  });
});

describe("isLiveControlProofFresh", () => {
  it("is not fresh without a parseable proven_at", () => {
    const now = new Date(PROVEN_AT_MS);
    expect(isLiveControlProofFresh(null, now)).toBe(false);
    expect(isLiveControlProofFresh("not-a-date", now)).toBe(false);
  });

  it("is fresh until the exclusive expiry instant", () => {
    expect(
      isLiveControlProofFresh(PROVEN_AT, new Date(PROVEN_AT_MS + PROOF_DISPLAY_TTL_MS - 1))
    ).toBe(true);
    expect(
      isLiveControlProofFresh(PROVEN_AT, new Date(PROVEN_AT_MS + PROOF_DISPLAY_TTL_MS))
    ).toBe(false);
    expect(
      isLiveControlProofFresh(PROVEN_AT, new Date(PROVEN_AT_MS + PROOF_DISPLAY_TTL_MS + 1))
    ).toBe(false);
  });
});
