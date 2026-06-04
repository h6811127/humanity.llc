import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { shouldRefreshNetworkBeforeShellBfcacheChrome } from "../../site/js/device-shell-resume-core.mjs";

describe("device-chrome-refresh bfcache resume (RC-12)", () => {
  it("wires network refresh before chrome on shell bfcache restore", () => {
    const src = readFileSync(
      new URL("../../site/js/device-chrome-refresh.mjs", import.meta.url),
      "utf8"
    );
    expect(src).toContain("setShellBfcacheNetworkRefresh");
    expect(src).toContain("onShellBfcacheRestore");
    expect(src).toContain("shouldRefreshNetworkBeforeShellBfcacheChrome");
    expect(src).toMatch(/await shellBfcacheNetworkRefresh\(\)/);
    expect(src).toMatch(/refreshDeviceChrome\(\{ immediate: true \}\)/);
  });

  it("device-status registers refreshNetwork for bfcache resume", () => {
    const src = readFileSync(
      new URL("../../site/js/device-status.mjs", import.meta.url),
      "utf8"
    );
    expect(src).toContain("setShellBfcacheNetworkRefresh(refreshNetwork)");
    expect(src).toMatch(/setShellBfcacheNetworkRefresh\(refreshNetwork\)/);
    const registerIdx = src.indexOf("setShellBfcacheNetworkRefresh(refreshNetwork)");
    const startIdx = src.indexOf("startDeviceChromeRefresh()");
    expect(registerIdx).toBeGreaterThan(-1);
    expect(startIdx).toBeGreaterThan(registerIdx);
  });

  it("skips central network refresh on /created/ (page-owned boot)", () => {
    expect(shouldRefreshNetworkBeforeShellBfcacheChrome("/created/")).toBe(false);
  });
});
