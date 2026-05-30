import { describe, expect, it } from "vitest";

import {
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
} from "../../site/js/device-shell-boot-core.mjs";
import { shouldSkipDotViewTransition } from "../../site/js/device-status-dot-view-transition-core.mjs";

const snap = (network, device, overlay) => ({ network, device, overlay });

describe("shouldSkipDotViewTransition (RC-14)", () => {
  it("skips when motion reduced, hub open, or API missing", () => {
    const base = {
      shellBootState: DEVICE_BOOT_READY,
      dotBootstrapSettled: true,
      previousSnapshot: snap("ok", "steward", "none"),
      nextSnapshot: snap("ok", "saved", "none"),
    };
    expect(
      shouldSkipDotViewTransition({ ...base, prefersReducedMotion: true })
    ).toBe(true);
    expect(shouldSkipDotViewTransition({ ...base, hubSheetOpen: true })).toBe(true);
    expect(
      shouldSkipDotViewTransition({ ...base, viewTransitionsSupported: false })
    ).toBe(true);
  });

  it("skips during shell boot and dot bootstrap", () => {
    const input = {
      prefersReducedMotion: false,
      hubSheetOpen: false,
      viewTransitionsSupported: true,
      previousSnapshot: snap("offline", "none", "none"),
      nextSnapshot: snap("ok", "steward", "none"),
    };
    expect(
      shouldSkipDotViewTransition({
        ...input,
        shellBootState: DEVICE_BOOT_PENDING,
        dotBootstrapSettled: true,
      })
    ).toBe(true);
    expect(
      shouldSkipDotViewTransition({
        ...input,
        shellBootState: DEVICE_BOOT_READY,
        dotBootstrapSettled: false,
      })
    ).toBe(true);
    expect(
      shouldSkipDotViewTransition({
        ...input,
        shellBootState: DEVICE_BOOT_READY,
        dotBootstrapSettled: true,
        previousSnapshot: null,
      })
    ).toBe(true);
  });

  it("skips when dot state key is unchanged", () => {
    expect(
      shouldSkipDotViewTransition({
        prefersReducedMotion: false,
        hubSheetOpen: false,
        viewTransitionsSupported: true,
        shellBootState: DEVICE_BOOT_READY,
        dotBootstrapSettled: true,
        previousSnapshot: snap("ok", "steward", "none"),
        nextSnapshot: snap("ok", "steward", "none"),
      })
    ).toBe(true);
  });

  it("skips cross-tab overlay-only flaps", () => {
    expect(
      shouldSkipDotViewTransition({
        prefersReducedMotion: false,
        hubSheetOpen: false,
        viewTransitionsSupported: true,
        shellBootState: DEVICE_BOOT_READY,
        dotBootstrapSettled: true,
        previousSnapshot: snap("ok", "steward", "none"),
        nextSnapshot: snap("ok", "steward", "cross_tab_keys"),
      })
    ).toBe(true);
  });

  it("allows transition after boot when network/device changes", () => {
    expect(
      shouldSkipDotViewTransition({
        prefersReducedMotion: false,
        hubSheetOpen: false,
        viewTransitionsSupported: true,
        shellBootState: DEVICE_BOOT_READY,
        dotBootstrapSettled: true,
        previousSnapshot: snap("offline", "none", "none"),
        nextSnapshot: snap("ok", "steward", "none"),
      })
    ).toBe(false);
  });
});
