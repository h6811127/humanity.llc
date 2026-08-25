import { describe, expect, it } from "vitest";

import {
  resolveScanMalformedReason,
  scanMalformedLead,
  scanMalformedPageTitle,
  scanMalformedStatusHint,
} from "../src/resolver/scan-malformed-hint";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const QR = "qr_E2eWakketTest9";

describe("resolveScanMalformedReason redirectBlocked", () => {
  it("wins over a valid profile and QR pair", () => {
    expect(
      resolveScanMalformedReason(PROFILE, QR, { redirectBlocked: true })
    ).toBe("redirect_blocked");
  });

  it("wins over missing QR, invalid QR, and invalid profile", () => {
    expect(
      resolveScanMalformedReason(PROFILE, null, { redirectBlocked: true })
    ).toBe("redirect_blocked");
    expect(
      resolveScanMalformedReason(PROFILE, "qr_FAKE123", { redirectBlocked: true })
    ).toBe("redirect_blocked");
    expect(
      resolveScanMalformedReason("not-a-real-profile", QR, {
        redirectBlocked: true,
      })
    ).toBe("redirect_blocked");
  });

  it("does not treat an omitted opts object as blocked", () => {
    expect(resolveScanMalformedReason(PROFILE, null)).toBe("missing_qr");
    expect(resolveScanMalformedReason(PROFILE, QR, {})).toBe(
      "invalid_profile_id"
    );
  });
});

describe("redirect_blocked scan copy", () => {
  it("tells the scanner to use the plain QR URL", () => {
    expect(scanMalformedLead("redirect_blocked")).toMatch(/not allowed/);
    expect(scanMalformedLead("redirect_blocked")).toMatch(/plain scan URL/);
    expect(scanMalformedPageTitle("redirect_blocked")).toBe("Invalid scan link");
    expect(scanMalformedStatusHint("redirect_blocked")).toMatch(
      /\?q=qr_/
    );
  });
});
