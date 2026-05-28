import { describe, expect, it } from "vitest";

import { DEVICE_OS_DEBOUNCE_MS, shouldRefreshLiveControlInbox, shouldRefreshWalletNetwork } from "../../site/js/device-os-coordinator-core.mjs";

describe("device-os-coordinator-core", () => {
  it("uses 300ms debounce window", () => {
    expect(DEVICE_OS_DEBOUNCE_MS).toBe(300);
  });

  it("refreshes wallet network on visible and hub-changed", () => {
    expect(shouldRefreshWalletNetwork("visible")).toBe(true);
    expect(shouldRefreshWalletNetwork("hub-changed")).toBe(true);
    expect(shouldRefreshWalletNetwork("baseline")).toBe(false);
  });

  it("refreshes live-control inbox on same reasons as wallet", () => {
    expect(shouldRefreshLiveControlInbox("init")).toBe(true);
    expect(shouldRefreshLiveControlInbox("manual")).toBe(true);
    expect(shouldRefreshLiveControlInbox("unknown")).toBe(false);
  });
});
