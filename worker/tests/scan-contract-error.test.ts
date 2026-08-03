import { describe, expect, it } from "vitest";

import { scanContractErrorForKind } from "../src/resolver/scan-contract-error";
import type { ScanPageKind } from "../src/resolver/scan-state";

describe("scanContractErrorForKind", () => {
  it("returns no contract error for the active scan kind", () => {
    expect(scanContractErrorForKind("active", "card")).toBeUndefined();
    expect(scanContractErrorForKind("active", null)).toBeUndefined();
  });

  it("maps card lifecycle kinds to CARD_* codes", () => {
    expect(scanContractErrorForKind("card_revoked", "card")).toBe("CARD_REVOKED");
    expect(scanContractErrorForKind("card_suspended", "card")).toBe("CARD_SUSPENDED");
    expect(scanContractErrorForKind("card_expired", "card")).toBe("CARD_EXPIRED");
  });

  it("distinguishes print_artifact QR revoke from generic QR revoke", () => {
    expect(scanContractErrorForKind("qr_revoked", "print_artifact")).toBe("PRINT_QR_REVOKED");
    expect(scanContractErrorForKind("qr_revoked", "card")).toBe("QR_REVOKED");
    expect(scanContractErrorForKind("qr_revoked", "child_object")).toBe("QR_REVOKED");
    expect(scanContractErrorForKind("qr_revoked", null)).toBe("QR_REVOKED");
  });

  it("maps QR expiry/replacement and unknown identifiers", () => {
    expect(scanContractErrorForKind("qr_expired", "card")).toBe("QR_EXPIRED");
    expect(scanContractErrorForKind("qr_replaced", "card")).toBe("QR_REPLACED");
    expect(scanContractErrorForKind("unknown_profile", null)).toBe("NOT_FOUND");
    expect(scanContractErrorForKind("unknown_qr", "card")).toBe("NOT_FOUND");
  });

  it("maps malformed / profile-qr mismatch to INVALID_PROFILE_ID", () => {
    expect(scanContractErrorForKind("malformed", null)).toBe("INVALID_PROFILE_ID");
    expect(scanContractErrorForKind("profile_qr_mismatch", "card")).toBe(
      "INVALID_PROFILE_ID"
    );
  });

  it("returns undefined for kinds without a contract error code", () => {
    // Cast keeps the default branch exercised if ScanPageKind grows.
    expect(
      scanContractErrorForKind("not_a_kind" as ScanPageKind, null)
    ).toBeUndefined();
  });
});
