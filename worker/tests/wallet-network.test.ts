import { describe, expect, it } from "vitest";

import { isRevokedSinceLastVisitFromBaseline } from "../../site/js/wallet-network-baseline.mjs";

describe("isRevokedSinceLastVisitFromBaseline", () => {
  it("returns false when the network status is not revoked", () => {
    expect(isRevokedSinceLastVisitFromBaseline("active", "active")).toBe(false);
  });

  it("returns false with no prior baseline on this device", () => {
    expect(isRevokedSinceLastVisitFromBaseline(null, "revoked")).toBe(false);
    expect(isRevokedSinceLastVisitFromBaseline("", "revoked")).toBe(false);
  });

  it("returns true when last seen was active and network is now revoked", () => {
    expect(isRevokedSinceLastVisitFromBaseline("active", "revoked")).toBe(true);
  });

  it("returns false after the user acknowledged revoked state", () => {
    expect(isRevokedSinceLastVisitFromBaseline("revoked", "revoked")).toBe(
      false
    );
  });
});
