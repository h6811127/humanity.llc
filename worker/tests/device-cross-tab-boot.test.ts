import { describe, expect, it } from "vitest";

import {
  shouldSuppressCrossTabChromeUntilShellBoot,
  suppressCrossTabNotificationStateUntilBoot,
  suppressCrossTabScanSnapshotUntilBoot,
} from "../../site/js/device-cross-tab-boot-core.mjs";
import {
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
} from "../../site/js/device-shell-boot-core.mjs";

describe("shouldSuppressCrossTabChromeUntilShellBoot", () => {
  it("suppresses when boot is missing or pending", () => {
    expect(shouldSuppressCrossTabChromeUntilShellBoot(undefined)).toBe(true);
    expect(shouldSuppressCrossTabChromeUntilShellBoot("")).toBe(true);
    expect(shouldSuppressCrossTabChromeUntilShellBoot(DEVICE_BOOT_PENDING)).toBe(true);
  });

  it("allows chrome when boot is ready", () => {
    expect(shouldSuppressCrossTabChromeUntilShellBoot(DEVICE_BOOT_READY)).toBe(false);
  });
});

describe("suppressCrossTabNotificationStateUntilBoot", () => {
  const settled = {
    showGeneric: true,
    showOrphan: false,
    genericEntries: [{ tabId: "t1", profile_id: "p1" }],
    orphanEntries: [],
    genericFingerprint: "t1:p1",
    orphanFingerprint: null,
    genericStreak: 2,
    orphanStreak: 0,
    badgeContribution: 1,
    fingerprint: "t1:p1",
  };

  it("clears visible surfaces while boot is pending but keeps streak metadata", () => {
    const suppressed = suppressCrossTabNotificationStateUntilBoot(settled, DEVICE_BOOT_PENDING);
    expect(suppressed.showGeneric).toBe(false);
    expect(suppressed.showOrphan).toBe(false);
    expect(suppressed.genericEntries).toHaveLength(0);
    expect(suppressed.badgeContribution).toBe(0);
    expect(suppressed.genericStreak).toBe(2);
  });

  it("passes through when boot is ready", () => {
    expect(suppressCrossTabNotificationStateUntilBoot(settled, DEVICE_BOOT_READY)).toEqual(
      settled
    );
  });
});

describe("suppressCrossTabScanSnapshotUntilBoot", () => {
  it("hides scan actor band until boot ready", () => {
    const snapshot = {
      show: true,
      entries: [{ tabId: "t1", profile_id: "p1" }],
    };
    expect(suppressCrossTabScanSnapshotUntilBoot(snapshot, DEVICE_BOOT_PENDING)).toEqual({
      show: false,
      entries: [],
    });
    expect(suppressCrossTabScanSnapshotUntilBoot(snapshot, DEVICE_BOOT_READY)).toEqual(snapshot);
  });
});
