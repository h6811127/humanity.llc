import { describe, expect, it } from "vitest";

import { buildPlannedItemScanUrl } from "../src/print/print-scan-url";

describe("buildPlannedItemScanUrl", () => {
  it("builds official scan URL and strips trailing origin slash", () => {
    expect(
      buildPlannedItemScanUrl(
        "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        "qr_planned001",
        "https://humanity.llc/"
      )
    ).toBe(
      "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_planned001"
    );
  });

  it("percent-encodes profile_id and planned qr_id in path/query", () => {
    expect(
      buildPlannedItemScanUrl("prof/a b", "qr/x y", "https://humanity.llc")
    ).toBe("https://humanity.llc/c/prof%2Fa%20b?q=qr%2Fx%20y");
  });

  it("defaults origin to production when omitted", () => {
    expect(buildPlannedItemScanUrl("abc123", "qr_1")).toBe(
      "https://humanity.llc/c/abc123?q=qr_1"
    );
  });
});
