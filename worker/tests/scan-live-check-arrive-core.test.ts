import { describe, expect, it } from "vitest";

import {
  SCAN_ARRIVE_MIN_CHECKING_MS,
  SCAN_ARRIVE_ROW_STAGGER_MS,
  SCAN_ARRIVE_SETTLE_MS,
  scanArriveSequenceMs,
} from "../../site/js/scan-live-check-arrive-core.mjs";

describe("scanArriveSequenceMs", () => {
  it("sums checking, stagger, and settle", () => {
    expect(scanArriveSequenceMs(3)).toBe(
      SCAN_ARRIVE_MIN_CHECKING_MS + 3 * SCAN_ARRIVE_ROW_STAGGER_MS + SCAN_ARRIVE_SETTLE_MS
    );
  });

  it("handles zero items", () => {
    expect(scanArriveSequenceMs(0)).toBe(
      SCAN_ARRIVE_MIN_CHECKING_MS + SCAN_ARRIVE_SETTLE_MS
    );
  });
});
