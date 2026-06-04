import { describe, expect, it } from "vitest";

import {
  SCAN_OWNER_RESTORE_CTA_HINT,
  SCAN_OWNER_RESTORE_CTA_LABEL,
} from "../../site/js/device-ownership-copy-core.mjs";
import {
  buildScanOwnerRestoreCreatedUrl,
  isScanOwnerRestoreCtaEligible,
  shouldHideScanOwnerRestoreCta,
} from "../../site/js/scan-owner-restore-cta-core.mjs";

describe("scan-owner-restore-cta-core", () => {
  it("eligible only for active print_artifact scans with profile id", () => {
    expect(
      isScanOwnerRestoreCtaEligible({
        kind: "active",
        qrScope: "print_artifact",
        profileId: "abc123",
      })
    ).toBe(true);
    expect(
      isScanOwnerRestoreCtaEligible({
        kind: "active",
        qrScope: "card",
        profileId: "abc123",
      })
    ).toBe(false);
    expect(
      isScanOwnerRestoreCtaEligible({
        kind: "qr_revoked",
        qrScope: "print_artifact",
        profileId: "abc123",
      })
    ).toBe(false);
  });

  it("builds /created/ link with restore hash and optional qr_id", () => {
    expect(
      buildScanOwnerRestoreCreatedUrl("https://humanity.llc", "prof1", "qr_1")
    ).toBe("https://humanity.llc/created/?profile_id=prof1&qr_id=qr_1#restore");
    expect(buildScanOwnerRestoreCreatedUrl("https://humanity.llc/", "prof1")).toBe(
      "https://humanity.llc/created/?profile_id=prof1#restore"
    );
  });

  it("hides CTA when tab session or wallet already has signing keys for scan profile", () => {
    expect(
      shouldHideScanOwnerRestoreCta({
        profileId: "prof1",
        session: {
          profile_id: "prof1",
          owner_private_key_b58: "priv",
        },
      })
    ).toBe(true);
    expect(
      shouldHideScanOwnerRestoreCta({
        profileId: "prof1",
        walletSigningProfileIds: ["prof1"],
      })
    ).toBe(true);
    expect(
      shouldHideScanOwnerRestoreCta({
        profileId: "prof1",
        session: { profile_id: "other" },
        walletSigningProfileIds: [],
      })
    ).toBe(false);
  });

  it("copy constants are plain-language and mention card page import", () => {
    expect(SCAN_OWNER_RESTORE_CTA_LABEL).toBe("Open controls");
    expect(SCAN_OWNER_RESTORE_CTA_HINT).toMatch(/card page/i);
    expect(SCAN_OWNER_RESTORE_CTA_HINT).toMatch(/recovery code/i);
  });
});
