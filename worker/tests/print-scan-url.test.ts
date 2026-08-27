import { describe, expect, it } from "vitest";

import { buildPlannedItemScanUrl as buildSitePlannedItemScanUrl } from "../../site/js/shop-customize-core.mjs";
import { buildPlannedItemScanUrl } from "../src/print/print-scan-url";

describe("buildPlannedItemScanUrl (worker merch fulfillment)", () => {
  it("builds the official /c/{profile}?q={qr} path", () => {
    expect(
      buildPlannedItemScanUrl("abc123", "qr_planned001", "https://humanity.llc")
    ).toBe("https://humanity.llc/c/abc123?q=qr_planned001");
  });

  it("defaults origin to humanity.llc and strips a trailing slash", () => {
    expect(buildPlannedItemScanUrl("abc123", "qr_planned001")).toBe(
      "https://humanity.llc/c/abc123?q=qr_planned001"
    );
    expect(
      buildPlannedItemScanUrl("abc123", "qr_planned001", "https://humanity.llc/")
    ).toBe("https://humanity.llc/c/abc123?q=qr_planned001");
  });

  it("percent-encodes profile and QR segments so printed artwork stays a valid scan URL", () => {
    expect(
      buildPlannedItemScanUrl("a b/c", "qr_&x=1", "https://humanity.llc")
    ).toBe("https://humanity.llc/c/a%20b%2Fc?q=qr_%26x%3D1");
  });

  it("stays in sync with the shop customizer helper", () => {
    const cases = [
      ["nSVXWPqgRFEhGPjxyRzidF6s", "qr_7Xk9mP2nQ4rT6vW8", "https://humanity.llc"],
      ["nSVXWPqgRFEhGPjxyRzidF6s", "qr_7Xk9mP2nQ4rT6vW8", "https://humanity.llc/"],
      ["abc123", "qr_planned001", undefined],
    ] as const;

    for (const [profileId, qrId, origin] of cases) {
      const workerUrl =
        origin === undefined
          ? buildPlannedItemScanUrl(profileId, qrId)
          : buildPlannedItemScanUrl(profileId, qrId, origin);
      const siteUrl =
        origin === undefined
          ? buildSitePlannedItemScanUrl(profileId, qrId)
          : buildSitePlannedItemScanUrl(profileId, qrId, origin);
      expect(workerUrl).toBe(siteUrl);
    }
  });
});
