import { describe, expect, it } from "vitest";

import type { QrScope } from "../src/db/types";
import { scanContractErrorForKind } from "../src/resolver/scan-contract-error";
import type { ScanPageKind } from "../src/resolver/scan-state";

const SCOPES: Array<QrScope | null> = ["card", "print_artifact", "child_object", null];

describe("scanContractErrorForKind", () => {
  it("leaves an active scan without a contract error", () => {
    for (const scope of SCOPES) {
      expect(scanContractErrorForKind("active", scope)).toBeUndefined();
    }
  });

  it("maps card and unknown kinds independently of QR scope", () => {
    const cases: Array<[ScanPageKind, string]> = [
      ["card_revoked", "CARD_REVOKED"],
      ["card_suspended", "CARD_SUSPENDED"],
      ["card_expired", "CARD_EXPIRED"],
      ["qr_expired", "QR_EXPIRED"],
      ["qr_replaced", "QR_REPLACED"],
      ["unknown_profile", "NOT_FOUND"],
      ["unknown_qr", "NOT_FOUND"],
      ["malformed", "INVALID_PROFILE_ID"],
      ["profile_qr_mismatch", "INVALID_PROFILE_ID"],
    ];
    for (const [kind, code] of cases) {
      for (const scope of SCOPES) {
        expect(scanContractErrorForKind(kind, scope)).toBe(code);
      }
    }
  });

  it("uses PRINT_QR_REVOKED only for print-artifact QR revocation", () => {
    expect(scanContractErrorForKind("qr_revoked", "print_artifact")).toBe(
      "PRINT_QR_REVOKED"
    );
    expect(scanContractErrorForKind("qr_revoked", "card")).toBe("QR_REVOKED");
    expect(scanContractErrorForKind("qr_revoked", "child_object")).toBe("QR_REVOKED");
    expect(scanContractErrorForKind("qr_revoked", null)).toBe("QR_REVOKED");
  });
});
