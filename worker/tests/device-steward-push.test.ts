import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.mock("../../site/js/hc-sign.mjs", () => ({
  resolverApiOrigin: () => "https://resolver.test",
}));

vi.mock("../../site/js/device-browser-notifications-core.mjs", () => ({
  isBrowserNotifEnabled: () => true,
}));

vi.mock("../../site/js/device-hub-network-tools-core.mjs", () => ({
  isWatchLiveProofEnabled: () => true,
}));

vi.mock("../../site/js/device-live-control-poll-leader.mjs", () => ({
  claimLiveControlPollLeader: vi.fn(),
  isLiveControlPollLeaderTab: () => true,
}));

vi.mock("../../site/js/device-live-control-poll-scheduler.mjs", () => ({
  resolveLiveControlPollScope: () => true,
}));

vi.mock("../../site/js/device-steward-entitlements.mjs", () => ({
  getStewardEntitlementsPolicy: () => ({
    stewardHosted: true,
    notifyPushLiveProof: true,
    pollLiveProofAutoDailyCap: 4000,
    pollLiveProofIdleMs: 30_000,
    pollLiveProofActiveMs: 5_000,
    pollNetworkMaxParallel: 5,
    pollNetworkManualMaxParallel: 3,
    walletLargeThreshold: 25,
    swPeriodicMinMs: 300_000,
    planId: "hosted_steward_v1",
    status: "active",
  }),
  readStewardSessionToken: () => "session-push-test",
  stewardPushSubscribeAllowed: () => true,
  stewardResolverRequestHeaders: () => ({
    Authorization: "Bearer session-push-test",
    "X-HC-Device-Id": "device-push-test",
  }),
}));

describe("device steward push client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mocks.fetch.mockReset();
    mocks.dispatchEvent.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: mocks.dispatchEvent,
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      body: { classList: { contains: () => false } },
      getElementById: () => ({ classList: { contains: () => false } }),
      addEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries the SSE connection after fallback cooldown expires", async () => {
    mocks.fetch.mockResolvedValue(new Response("down", { status: 503 }));
    const {
      STEWARD_PUSH_DOWN_FALLBACK_MS,
      syncStewardPushConnection,
    } = await import("../../site/js/device-steward-push.mjs");

    syncStewardPushConnection();
    await vi.runAllTicks();
    await Promise.resolve();

    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(STEWARD_PUSH_DOWN_FALLBACK_MS - 1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
