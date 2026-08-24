import { describe, expect, it } from "vitest";

import {
  httpStatusForScanKind,
  type ScanPageKind,
} from "../src/resolver/scan-state";

describe("httpStatusForScanKind", () => {
  it("returns 404 only for unknown profile or QR", () => {
    expect(httpStatusForScanKind("unknown_profile")).toBe(404);
    expect(httpStatusForScanKind("unknown_qr")).toBe(404);
  });

  it("returns 400 for malformed and profile/QR mismatch", () => {
    expect(httpStatusForScanKind("malformed")).toBe(400);
    expect(httpStatusForScanKind("profile_qr_mismatch")).toBe(400);
  });

  it("returns 410 only for card_revoked, not QR or suspension kinds", () => {
    expect(httpStatusForScanKind("card_revoked")).toBe(410);
    const stay200: ScanPageKind[] = [
      "active",
      "card_suspended",
      "card_expired",
      "qr_revoked",
      "qr_expired",
      "qr_replaced",
    ];
    for (const kind of stay200) {
      expect(httpStatusForScanKind(kind)).toBe(200);
    }
  });
});
