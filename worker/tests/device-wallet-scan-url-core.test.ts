import { describe, expect, it } from "vitest";

import {
  normalizeWalletRecoveryImportLabels,
  normalizeWalletScanUrls,
  parseQrIdFromCardRef,
  resolveWalletEntryScanUrl,
  scanUrlHasOfficialQrParam,
} from "../../site/js/device-wallet-scan-url-core.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3c";
const ORIGIN = "https://humanity.llc";

describe("device-wallet-scan-url-core", () => {
  it("detects official scan URLs with q= parameter", () => {
    expect(
      scanUrlHasOfficialQrParam(`https://humanity.llc/c/${PROFILE_ID}?q=${QR_ID}`)
    ).toBe(true);
    expect(scanUrlHasOfficialQrParam(`https://humanity.llc/c/${PROFILE_ID}`)).toBe(false);
  });

  it("parses qr id from pasted scan link", () => {
    expect(
      parseQrIdFromCardRef(`https://humanity.llc/c/${PROFILE_ID}?q=${QR_ID}`)
    ).toBe(QR_ID);
  });

  it("repairs stored scan_url missing ?q= when qr_id is present", () => {
    const url = resolveWalletEntryScanUrl(
      {
        profile_id: PROFILE_ID,
        scan_url: `https://humanity.llc/c/${PROFILE_ID}`,
        qr_id: QR_ID,
      },
      ORIGIN,
      QR_ID
    );
    expect(url).toBe(`https://humanity.llc/c/${PROFILE_ID}?q=${encodeURIComponent(QR_ID)}`);
  });

  it("normalizes wallet rows with broken recovery-import scan_url", () => {
    const result = normalizeWalletScanUrls(
      [
        {
          profile_id: PROFILE_ID,
          scan_url: `https://humanity.llc/c/${PROFILE_ID}`,
          qr_id: QR_ID,
        },
      ],
      ORIGIN,
      (entry) => String(entry.qr_id ?? "")
    );
    expect(result.changed).toBe(true);
    expect(result.entries[0].scan_url).toContain("?q=");
  });

  it("repairs recovery-import placeholder labels", () => {
    const result = normalizeWalletRecoveryImportLabels([
      {
        profile_id: PROFILE_ID,
        label: PROFILE_ID.slice(0, 12),
        handle: "spencer",
      },
    ]);
    expect(result.changed).toBe(true);
    expect(result.entries[0].label).toBe("@spencer");
  });
});
