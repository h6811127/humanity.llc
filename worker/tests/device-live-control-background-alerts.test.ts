import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS,
  LIVE_CONTROL_POLL_MS_ACTIVE,
  liveControlBackgroundAlertPollShouldRun,
  liveProofForegroundAlertPollShouldRun,
  liveControlManualPollAllowedByResolverHealth,
  relayOfferAlertPollIntervalMs,
  relayOfferAlertPollShouldRun,
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

describe("liveControlManualPollAllowedByResolverHealth", () => {
  it("allows ok and unset; blocks degraded and offline", () => {
    expect(liveControlManualPollAllowedByResolverHealth("ok")).toBe(true);
    expect(liveControlManualPollAllowedByResolverHealth("unset")).toBe(true);
    expect(liveControlManualPollAllowedByResolverHealth("degraded")).toBe(false);
    expect(liveControlManualPollAllowedByResolverHealth("offline")).toBe(false);
  });
});

describe("relayOfferAlertPollShouldRun", () => {
  it("runs when alerts on, relays in wallet, resolver ok (visible or hidden tab)", () => {
    expect(
      relayOfferAlertPollShouldRun({
        alertsEnabled: true,
        relayEligible: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
  });

  it("skips when alerts off, no relays, or resolver bad", () => {
    expect(
      relayOfferAlertPollShouldRun({
        alertsEnabled: false,
        relayEligible: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      relayOfferAlertPollShouldRun({
        alertsEnabled: true,
        relayEligible: false,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      relayOfferAlertPollShouldRun({
        alertsEnabled: true,
        relayEligible: true,
        resolverHealth: "offline",
      })
    ).toBe(false);
  });

  it("uses faster interval when relay messages pending", () => {
    expect(relayOfferAlertPollIntervalMs(0)).toBe(LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS);
    expect(relayOfferAlertPollIntervalMs(2)).toBe(LIVE_CONTROL_POLL_MS_ACTIVE);
  });
});

describe("liveProofForegroundAlertPollShouldRun", () => {
  it("runs when alerts on, tab visible, watch off, pollable cards, resolver ok", () => {
    expect(
      liveProofForegroundAlertPollShouldRun({
        alertsEnabled: true,
        tabVisible: true,
        watchEnabled: false,
        hasPollableCards: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
  });

  it("skips when watch on, tab hidden, no cards, or alerts off", () => {
    expect(
      liveProofForegroundAlertPollShouldRun({
        alertsEnabled: true,
        tabVisible: true,
        watchEnabled: true,
        hasPollableCards: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveProofForegroundAlertPollShouldRun({
        alertsEnabled: true,
        tabVisible: false,
        watchEnabled: false,
        hasPollableCards: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveProofForegroundAlertPollShouldRun({
        alertsEnabled: false,
        tabVisible: true,
        watchEnabled: false,
        hasPollableCards: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveProofForegroundAlertPollShouldRun({
        alertsEnabled: true,
        tabVisible: true,
        watchEnabled: false,
        hasPollableCards: false,
        resolverHealth: "ok",
      })
    ).toBe(false);
  });
});
