import { describe, expect, it } from "vitest";

import {
  isDeviceShellResumePagePath,
  shouldHandleShellBfcacheRestore,
  SHELL_BFCACHE_RESTORE_EVENT,
} from "../../site/js/device-shell-resume-core.mjs";

describe("device-shell-resume-core (RC-12)", () => {
  it("defines bfcache restore event name", () => {
    expect(SHELL_BFCACHE_RESTORE_EVENT).toBe("hc-shell-bfcache-resume");
  });

  it("matches device shell page paths", () => {
    expect(isDeviceShellResumePagePath("/")).toBe(true);
    expect(isDeviceShellResumePagePath("/index.html")).toBe(true);
    expect(isDeviceShellResumePagePath("/wallet/")).toBe(true);
    expect(isDeviceShellResumePagePath("/wallet/index.html")).toBe(true);
    expect(isDeviceShellResumePagePath("/created/")).toBe(true);
    expect(isDeviceShellResumePagePath("/create/")).toBe(true);
  });

  it("excludes scan and marketing paths", () => {
    expect(isDeviceShellResumePagePath("/c/abc")).toBe(false);
    expect(isDeviceShellResumePagePath("/features-available-now.html")).toBe(false);
  });

  it("handles bfcache restore only when persisted on shell pages", () => {
    expect(
      shouldHandleShellBfcacheRestore({ persisted: true, pathname: "/wallet/" })
    ).toBe(true);
    expect(
      shouldHandleShellBfcacheRestore({ persisted: false, pathname: "/wallet/" })
    ).toBe(false);
    expect(
      shouldHandleShellBfcacheRestore({ persisted: true, pathname: "/c/demo" })
    ).toBe(false);
  });
});
