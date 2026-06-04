import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS,
  liveControlBackgroundAlertPollShouldRun,
} from "../../site/js/device-live-control-poll-scheduler.mjs";

describe("liveControlBackgroundAlertPollShouldRun", () => {
  it("runs when tab hidden, alerts on, resolver ok", () => {
    expect(
      liveControlBackgroundAlertPollShouldRun({
        alertsEnabled: true,
        permissionGranted: true,
        tabHidden: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
  });

  it("skips when tab visible, alerts off, push healthy, or resolver bad", () => {
    expect(
      liveControlBackgroundAlertPollShouldRun({
        alertsEnabled: true,
        permissionGranted: true,
        tabHidden: false,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveControlBackgroundAlertPollShouldRun({
        alertsEnabled: false,
        permissionGranted: true,
        tabHidden: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveControlBackgroundAlertPollShouldRun({
        alertsEnabled: true,
        permissionGranted: true,
        tabHidden: true,
        resolverHealth: "ok",
        stewardPushHealthy: true,
      })
    ).toBe(false);
    expect(
      liveControlBackgroundAlertPollShouldRun({
        alertsEnabled: true,
        permissionGranted: true,
        tabHidden: true,
        resolverHealth: "degraded",
      })
    ).toBe(false);
  });

  it("uses 60s idle interval constant", () => {
    expect(LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS).toBe(60_000);
  });
});
