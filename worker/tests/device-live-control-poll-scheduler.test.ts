import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_POLL_MS_ACTIVE,
  LIVE_CONTROL_POLL_MS_IDLE,
  WALLET_NETWORK_VISIBILITY_REFRESH_MS,
  isDeviceHubExpanded,
  liveControlPollIntervalMs,
  liveControlPollAllowedByResolverHealth,
  liveControlAutoPollShouldRun,
  liveControlPollLoopShouldRun,
  liveControlPollTickShouldFetch,
  liveControlPollingShouldRun,
  nextRoundRobinIndex,
  pickRoundRobinPollIndex,
  resolveLiveControlPollScope,
  walletNetworkVisibilityRefreshAllowed,
} from "../../site/js/device-live-control-poll-scheduler.mjs";
import { REFERENCE_FREE_POLICY } from "../../site/js/device-steward-entitlements-core.mjs";

describe("liveControlPollIntervalMs", () => {
  it("uses 5s when pending proof exists", () => {
    expect(liveControlPollIntervalMs(1)).toBe(LIVE_CONTROL_POLL_MS_ACTIVE);
  });

  it("uses 60s when idle on free tier", () => {
    expect(liveControlPollIntervalMs(0)).toBe(LIVE_CONTROL_POLL_MS_IDLE);
    expect(LIVE_CONTROL_POLL_MS_IDLE).toBe(60_000);
  });

  it("uses hosted idle interval from policy", () => {
    expect(
      liveControlPollIntervalMs(0, {
        ...REFERENCE_FREE_POLICY,
        pollLiveProofIdleMs: 30_000,
      })
    ).toBe(30_000);
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

  it("does not run on wallet page when watch is off", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: false,
        inboxSheetOpen: false,
        walletPage: true,
        watchEnabled: false,
      })
    ).toBe(false);
  });

  it("does not run on wallet page when hub collapsed (manual check / expand hub)", () => {
    expect(
      liveControlPollingShouldRun({
        hubExpanded: false,
        inboxSheetOpen: false,
        walletPage: true,
        watchEnabled: true,
      })
    ).toBe(false);
  });
});

describe("liveControlPollAllowedByResolverHealth", () => {
  it("allows polling only when resolver health is ok", () => {
    expect(liveControlPollAllowedByResolverHealth("ok")).toBe(true);
    expect(liveControlPollAllowedByResolverHealth("degraded")).toBe(false);
    expect(liveControlPollAllowedByResolverHealth("offline")).toBe(false);
  });
});

describe("liveControlAutoPollShouldRun", () => {
  it("requires watch on plus scope and resolver ok", () => {
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: true,
        scopeActive: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: false,
        scopeActive: true,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: true,
        scopeActive: false,
        resolverHealth: "ok",
      })
    ).toBe(false);
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: true,
        scopeActive: true,
        resolverHealth: "degraded",
      })
    ).toBe(false);
  });

  it("blocks when budget exhausted or not poll leader", () => {
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: true,
        scopeActive: true,
        resolverHealth: "ok",
        budgetExhausted: true,
      })
    ).toBe(false);
    expect(
      liveControlAutoPollShouldRun({
        watchEnabled: true,
        scopeActive: true,
        resolverHealth: "ok",
        isPollLeader: false,
      })
    ).toBe(false);
  });
});

describe("liveControlPollLoopShouldRun", () => {
  it("requires scope and resolver ok", () => {
    expect(
      liveControlPollLoopShouldRun({
        scopeActive: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
    expect(
      liveControlPollLoopShouldRun({
        scopeActive: true,
        resolverHealth: "degraded",
      })
    ).toBe(false);
    expect(
      liveControlPollLoopShouldRun({
        scopeActive: false,
        resolverHealth: "ok",
      })
    ).toBe(false);
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

describe("round-robin poll index", () => {
  it("picks one index per tick and advances cursor", () => {
    expect(pickRoundRobinPollIndex(0, 3)).toBe(0);
    expect(nextRoundRobinIndex(0, 3)).toBe(1);
    expect(pickRoundRobinPollIndex(2, 3)).toBe(2);
    expect(nextRoundRobinIndex(2, 3)).toBe(0);
    expect(pickRoundRobinPollIndex(0, 0)).toBe(-1);
    expect(nextRoundRobinIndex(0, 0)).toBe(0);
  });
});

describe("walletNetworkVisibilityRefreshAllowed", () => {
  it("allows first fetch and blocks until min interval", () => {
    expect(walletNetworkVisibilityRefreshAllowed(0, 1000)).toBe(true);
    expect(
      walletNetworkVisibilityRefreshAllowed(
        1000,
        1000 + WALLET_NETWORK_VISIBILITY_REFRESH_MS - 1
      )
    ).toBe(false);
    expect(
      walletNetworkVisibilityRefreshAllowed(
        1000,
        1000 + WALLET_NETWORK_VISIBILITY_REFRESH_MS
      )
    ).toBe(true);
  });
});

describe("resolveLiveControlPollScope", () => {
  it("does not scope poll on wallet page when hub collapsed", () => {
    /** @type {HTMLElement} */
    const collapsed = {
      classList: { contains: (c) => c === "device-hub-collapsed" },
    };
    expect(
      resolveLiveControlPollScope({
        hubEl: collapsed,
        inboxSheetOpen: false,
        walletPage: true,
        watchEnabled: false,
      })
    ).toBe(false);
    expect(
      resolveLiveControlPollScope({
        hubEl: collapsed,
        inboxSheetOpen: false,
        walletPage: true,
        watchEnabled: true,
      })
    ).toBe(false);
  });

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
