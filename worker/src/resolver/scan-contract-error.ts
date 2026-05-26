import type { QrScope } from "../db/types";
import type { ScanPageKind } from "./scan-state";

/**
 * Contract error codes for scan status JSON (`scan.error`).
 * Aligns with `docs/V1_IMPLEMENTATION_CONTRACTS.md` § Error Contracts where defined.
 * `scan.kind` remains the stable snake_case view model key.
 */
export function scanContractErrorForKind(
  kind: ScanPageKind,
  qrScope: QrScope | null
): string | undefined {
  switch (kind) {
    case "active":
      return undefined;
    case "card_revoked":
      return "CARD_REVOKED";
    case "card_suspended":
      return "CARD_SUSPENDED";
    case "card_expired":
      return "CARD_EXPIRED";
    case "qr_revoked":
      return qrScope === "print_artifact" ? "PRINT_QR_REVOKED" : "QR_REVOKED";
    case "qr_expired":
      return "QR_EXPIRED";
    case "qr_replaced":
      return "QR_REPLACED";
    case "unknown_profile":
    case "unknown_qr":
      return "NOT_FOUND";
    case "malformed":
    case "profile_qr_mismatch":
      return "INVALID_PROFILE_ID";
    default:
      return undefined;
  }
}
