import { describe, expect, it } from "vitest";

import {
  SCAN_ARRIVE_CHECKING_LABEL,
  SCAN_ARRIVE_MIN_CHECKING_MS,
  SCAN_ARRIVE_ROW_STAGGER_MS,
  SCAN_ARRIVE_SETTLE_MS,
  scanArriveLabelsAgree,
  scanArriveSequenceMs,
  shouldSkipScanArriveCheckingPhase,
  shouldUseScanArriveSsrFastPath,
} from "../../site/js/scan-live-check-arrive-core.mjs";

describe("scanArriveLabelsAgree", () => {
  it("is true when strip text matches data-arrive-label", () => {
    expect(scanArriveLabelsAgree("Active", "Active")).toBe(true);
  });

  it("is false when strip still shows checking copy", () => {
    expect(scanArriveLabelsAgree("Active", SCAN_ARRIVE_CHECKING_LABEL)).toBe(false);
  });
});

describe("shouldSkipScanArriveCheckingPhase", () => {
  it("skips when online, truth verified, and labels agree", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: "Active",
        online: true,
        truthVerified: true,
      })
    ).toBe(true);
  });

  it("does not skip when labels agree but truth is not verified", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: "Active",
        online: true,
        truthVerified: false,
      })
    ).toBe(false);
  });

  it("does not skip when offline (stale SSR may disagree)", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: "Active",
        online: false,
      })
    ).toBe(false);
  });

  it("does not skip when legacy HTML still shows checking copy", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: SCAN_ARRIVE_CHECKING_LABEL,
        online: true,
      })
    ).toBe(false);
  });
});

describe("shouldUseScanArriveSsrFastPath", () => {
  it("is true when truth is verified and SSR strip labels match", () => {
    const hero = {
      querySelector: (sel) => {
        if (sel === ".scan-arrive-strip") {
          return {
            dataset: { arriveLabel: "Active" },
            querySelector: () => ({ textContent: "Active" }),
          };
        }
        return null;
      },
    };
    expect(shouldUseScanArriveSsrFastPath(hero, { truthVerified: true })).toBe(true);
    expect(shouldUseScanArriveSsrFastPath(hero)).toBe(false);
  });

  it("is false when arrive label is missing", () => {
    expect(shouldUseScanArriveSsrFastPath(null)).toBe(false);
    expect(
      shouldUseScanArriveSsrFastPath({
        querySelector: () => ({
          dataset: {},
          querySelector: () => ({ textContent: "Active" }),
        }),
      })
    ).toBe(false);
  });
});

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

  it("skips checking hold on SSR fast path (RC-8)", () => {
    expect(scanArriveSequenceMs(3, { ssrFastPath: true })).toBe(
      3 * SCAN_ARRIVE_ROW_STAGGER_MS + SCAN_ARRIVE_SETTLE_MS
    );
  });
});
