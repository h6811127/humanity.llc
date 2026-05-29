import { describe, expect, it, vi } from "vitest";

import {
  clampPullToRefreshDistance,
  isStandaloneMode,
  isPullToRefreshPath,
  pullToRefreshAllowed,
  pullToRefreshAtScrollTop,
  pullToRefreshIndicatorLabel,
  pullToRefreshPullState,
  pullToRefreshShouldCommit,
  readStandaloneModeFromWindow,
  runStandaloneSoftRefreshPipeline,
  shouldRefreshNetworkChipsOnResume,
  shouldTriggerStandaloneResumeRefresh,
  PTR_THRESHOLD_PX,
  STANDALONE_SOFT_REFRESH_DEBOUNCE_MS,
  STANDALONE_SOFT_REFRESH_STEPS,
} from "../../site/js/pwa-standalone-refresh-core.mjs";

describe("isStandaloneMode", () => {
  it("detects display-mode standalone", () => {
    expect(isStandaloneMode({ displayModeStandalone: true })).toBe(true);
  });

  it("detects legacy iOS standalone", () => {
    expect(isStandaloneMode({ legacyIosStandalone: true })).toBe(true);
  });

  it("returns false in browser tab", () => {
    expect(isStandaloneMode({})).toBe(false);
  });
});

describe("readStandaloneModeFromWindow", () => {
  it("reads matchMedia and navigator.standalone", () => {
    const win = {
      matchMedia: () => ({ matches: true }),
      navigator: { standalone: false },
    };
    expect(readStandaloneModeFromWindow(/** @type {Window} */ (win))).toBe(true);
  });

  it("returns false without window", () => {
    expect(readStandaloneModeFromWindow(null)).toBe(false);
  });
});

describe("shouldTriggerStandaloneResumeRefresh", () => {
  it("runs on visibility visible in standalone", () => {
    expect(
      shouldTriggerStandaloneResumeRefresh({
        standalone: true,
        eventKind: "visibilitychange",
        visibilityState: "visible",
      })
    ).toBe(true);
  });

  it("ignores visibility hidden", () => {
    expect(
      shouldTriggerStandaloneResumeRefresh({
        standalone: true,
        eventKind: "visibilitychange",
        visibilityState: "hidden",
      })
    ).toBe(false);
  });

  it("runs on bfcache pageshow persisted", () => {
    expect(
      shouldTriggerStandaloneResumeRefresh({
        standalone: true,
        eventKind: "pageshow",
        pageshowPersisted: true,
      })
    ).toBe(true);
  });

  it("ignores non-persisted pageshow", () => {
    expect(
      shouldTriggerStandaloneResumeRefresh({
        standalone: true,
        eventKind: "pageshow",
        pageshowPersisted: false,
      })
    ).toBe(false);
  });

  it("ignores browser tab even when visible", () => {
    expect(
      shouldTriggerStandaloneResumeRefresh({
        standalone: false,
        eventKind: "visibilitychange",
        visibilityState: "visible",
      })
    ).toBe(false);
  });
});

describe("shouldRefreshNetworkChipsOnResume", () => {
  const now = Date.parse("2026-05-29T12:00:00.000Z");

  it("allows refresh on wallet page when debounce elapsed", () => {
    expect(
      shouldRefreshNetworkChipsOnResume(
        {
          hasWallet: true,
          onWalletPage: true,
          hubExpanded: false,
        },
        now,
        now - 61_000
      )
    ).toBe(true);
  });

  it("skips when hub collapsed on landing", () => {
    expect(
      shouldRefreshNetworkChipsOnResume(
        {
          hasWallet: true,
          onWalletPage: false,
          hubExpanded: false,
        },
        now,
        0
      )
    ).toBe(false);
  });

  it("respects visibility debounce window", () => {
    expect(
      shouldRefreshNetworkChipsOnResume(
        {
          hasWallet: true,
          onWalletPage: true,
          hubExpanded: false,
        },
        now,
        now - 30_000
      )
    ).toBe(false);
  });

  it("skips without saved cards", () => {
    expect(
      shouldRefreshNetworkChipsOnResume(
        {
          hasWallet: false,
          onWalletPage: true,
          hubExpanded: true,
        },
        now,
        0
      )
    ).toBe(false);
  });
});

describe("runStandaloneSoftRefreshPipeline", () => {
  it("runs wallet then chrome without reload", () => {
    const order = [];
    const refreshDeviceHub = vi.fn(() => order.push("wallet"));
    const refreshDeviceChrome = vi.fn(() => order.push("chrome"));

    runStandaloneSoftRefreshPipeline(
      { refreshDeviceHub, refreshDeviceChrome },
      { reason: "resume" }
    );

    expect(order).toEqual(["wallet", "chrome"]);
    expect(refreshDeviceChrome).toHaveBeenCalledWith({ immediate: true });
    expect(STANDALONE_SOFT_REFRESH_STEPS).toEqual(["wallet", "chrome"]);
    expect(STANDALONE_SOFT_REFRESH_DEBOUNCE_MS).toBeGreaterThan(0);
  });
});

describe("pullToRefreshAllowed", () => {
  it("allows standalone landing when sheets closed", () => {
    expect(
      pullToRefreshAllowed({
        standalone: true,
        pathname: "/",
        hubSheetOpen: false,
        inboxSheetOpen: false,
      })
    ).toBe(true);
  });

  it("allows standalone wallet", () => {
    expect(
      pullToRefreshAllowed({
        standalone: true,
        pathname: "/wallet/",
        hubSheetOpen: false,
        inboxSheetOpen: false,
      })
    ).toBe(true);
  });

  it("blocks browser tab", () => {
    expect(
      pullToRefreshAllowed({
        standalone: false,
        pathname: "/",
        hubSheetOpen: false,
        inboxSheetOpen: false,
      })
    ).toBe(false);
  });

  it("blocks created path", () => {
    expect(
      pullToRefreshAllowed({
        standalone: true,
        pathname: "/created/",
        hubSheetOpen: false,
        inboxSheetOpen: false,
      })
    ).toBe(false);
  });

  it("blocks when hub sheet open", () => {
    expect(
      pullToRefreshAllowed({
        standalone: true,
        pathname: "/",
        hubSheetOpen: true,
        inboxSheetOpen: false,
      })
    ).toBe(false);
  });

  it("blocks when inbox sheet open", () => {
    expect(
      pullToRefreshAllowed({
        standalone: true,
        pathname: "/",
        hubSheetOpen: false,
        inboxSheetOpen: true,
      })
    ).toBe(false);
  });
});

describe("isPullToRefreshPath", () => {
  it("matches landing and wallet only", () => {
    expect(isPullToRefreshPath("/")).toBe(true);
    expect(isPullToRefreshPath("/wallet/")).toBe(true);
    expect(isPullToRefreshPath("/created/")).toBe(false);
    expect(isPullToRefreshPath("/create/")).toBe(false);
  });
});

describe("pull gesture helpers", () => {
  it("requires scroll top to start", () => {
    expect(pullToRefreshAtScrollTop(0)).toBe(true);
    expect(pullToRefreshAtScrollTop(12)).toBe(false);
  });

  it("commits past threshold", () => {
    expect(pullToRefreshShouldCommit(PTR_THRESHOLD_PX - 1)).toBe(false);
    expect(pullToRefreshShouldCommit(PTR_THRESHOLD_PX)).toBe(true);
  });

  it("clamps pull distance", () => {
    expect(clampPullToRefreshDistance(200)).toBeLessThanOrEqual(120);
  });

  it("labels pull states", () => {
    expect(pullToRefreshPullState(10)).toBe("pulling");
    expect(pullToRefreshPullState(PTR_THRESHOLD_PX)).toBe("ready");
    expect(pullToRefreshIndicatorLabel("updated")).toBe("Updated");
    expect(pullToRefreshIndicatorLabel("refreshing")).toMatch(/Refreshing/);
  });
});
