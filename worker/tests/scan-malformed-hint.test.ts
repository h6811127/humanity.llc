import { describe, expect, it } from "vitest";

import {
  resolveScanMalformedReason,
  scanMalformedLead,
  scanMalformedPageTitle,
  scanMalformedStatusHint,
} from "../src/resolver/scan-malformed-hint";
import { malformedScanView } from "../src/resolver/scan-state";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const QR = "qr_E2eWakketTest9";

describe("scan-malformed-hint", () => {
  it("detects missing qr when profile id is valid", () => {
    expect(resolveScanMalformedReason(PROFILE, null)).toBe("missing_qr");
    expect(scanMalformedLead("missing_qr")).toMatch(/\?q=qr_/);
  });

  it("detects invalid profile id", () => {
    expect(resolveScanMalformedReason("not-a-real-profile", null)).toBe(
      "invalid_profile_id"
    );
    expect(scanMalformedPageTitle("invalid_profile_id")).toBe("Invalid card link");
  });

  it("detects invalid qr id format", () => {
    expect(resolveScanMalformedReason(PROFILE, "qr_FAKE123")).toBe("invalid_qr_id");
    expect(scanMalformedStatusHint("invalid_qr_id")).toMatch(/qr_/);
  });

  it("attaches reason on malformedScanView", () => {
    const vm = malformedScanView(PROFILE, null, "https://humanity.llc");
    expect(vm.malformedReason).toBe("missing_qr");
    expect(scanMalformedLead(vm.malformedReason!)).not.toBe(
      scanMalformedLead("invalid_profile_id")
    );
  });
});
