import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_POLL_MS_ACTIVE,
  LIVE_CONTROL_POLL_MS_IDLE,
  isDeviceHubExpanded,
  liveControlPollIntervalMs,
  liveControlPollTickShouldFetch,
  liveControlPollingShouldRun,
  resolveLiveControlPollScope,
} from "../../site/js/device-live-control-poll-scheduler.mjs";

describe("liveControlPollIntervalMs", () => {
  it("uses 5s when pending proof exists", () => {
    expect(liveControlPollIntervalMs(1)).toBe(LIVE_CONTROL_POLL_MS_ACTIVE);
  });

  it("uses 30s when idle", () => {
    expect(liveControlPollIntervalMs(0)).toBe(LIVE_CONTROL_POLL_MS_IDLE);
  });
});

describe("liveControlPollingShouldRun", () => {
  it("runs when inbox sheet is open", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: false,
        inboxSheetOpen: true,
        walletPage: false,
      })
    ).toBe(true);
  });

  it("runs when hub sheet is expanded", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: true,
        inboxSheetOpen: false,
        walletPage: false,
      })
    ).toBe(true);
  });

  it("does not run when hub collapsed and inbox closed", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: false,
        inboxSheetOpen: false,
        walletPage: false,
      })
    ).toBe(false);
  });

  it("runs on wallet page even when hub element collapsed", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: false,
        inboxSheetOpen: false,
        walletPage: true,
      })
    ).toBe(true);
  });
});

describe("liveControlPollTickShouldFetch", () => {
  it("skips when tab hidden or in backoff", () => {
    expect(
      liveControlPollTickShouldFetch({
        documentVisible: false,
        backoffUntil: 0,
        now: 1000,
      })
    ).toBe(false);
    expect(
      liveControlPollTickShouldFetch({
        documentVisible: true,
        backoffUntil: 2000,
        now: 1000,
      })
    ).toBe(false);
  });

  it("fetches when visible and not in backoff", () => {
    expect(
      liveControlPollTickShouldFetch({
        documentVisible: true,
        backoffUntil: 0,
        now: 1000,
      })
    ).toBe(true);
  });
});

describe("isDeviceHubExpanded", () => {
  it("returns false when hub missing or collapsed", () => {
    expect(isDeviceHubExpanded(null)).toBe(false);
    /** @type {HTMLElement} */
    const collapsed = {
      classList: { contains: (c) => c === "device-hub-collapsed" },
    };
    expect(isDeviceHubExpanded(collapsed)).toBe(false);
    /** @type {HTMLElement} */
    const expanded = {
      classList: { contains: () => false },
    };
    expect(isDeviceHubExpanded(expanded)).toBe(true);
  });
});

describe("resolveLiveControlPollScope", () => {
  it("combines hub, inbox, and wallet flags", () => {
    /** @type {HTMLElement} */
    const collapsed = {
      classList: { contains: (c) => c === "device-hub-collapsed" },
    };
    expect(
      resolveLiveControlPollScope({
        hubEl: collapsed,
        inboxSheetOpen: false,
        walletPage: false,
      })
    ).toBe(false);
    /** @type {HTMLElement} */
    const expanded = {
      classList: { contains: () => false },
    };
    expect(
      resolveLiveControlPollScope({
        hubEl: expanded,
        inboxSheetOpen: false,
        walletPage: false,
      })
    ).toBe(true);
  });
});
