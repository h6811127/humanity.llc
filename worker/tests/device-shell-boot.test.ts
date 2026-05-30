import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
  DEVICE_BOOT_READY_EVENT,
  isDeviceBootReadyState,
  pageOwnsDeviceBootReady,
} from "../../site/js/device-shell-boot-core.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

describe("device-shell-boot-core", () => {
  it("defines pending and ready boot states", () => {
    expect(DEVICE_BOOT_PENDING).toBe("pending");
    expect(DEVICE_BOOT_READY).toBe("ready");
    expect(DEVICE_BOOT_READY_EVENT).toBe("hc-device-boot-ready");
    expect(isDeviceBootReadyState(DEVICE_BOOT_READY)).toBe(true);
    expect(isDeviceBootReadyState(DEVICE_BOOT_PENDING)).toBe(false);
  });

  it("defers boot ready on /created/ to the page module", () => {
    expect(pageOwnsDeviceBootReady("/created/")).toBe(true);
    expect(pageOwnsDeviceBootReady("/created/index.html")).toBe(true);
    expect(pageOwnsDeviceBootReady("/")).toBe(false);
    expect(pageOwnsDeviceBootReady("/wallet/")).toBe(false);
  });
});

describe("device-shell boot CSS (RC-1)", () => {
  it("gates personalized rows until data-boot=ready", () => {
    const css = fs.readFileSync(path.join(repoRoot, "site/css/device-shell.css"), "utf8");
    expect(css).toContain("body[data-boot=\"pending\"] .device-boot-gated");
    expect(css).toContain("body[data-boot=\"ready\"] .device-boot-gated");
  });

  it("shell pages start with data-boot=pending", () => {
    for (const page of [
      "site/index.html",
      "site/wallet/index.html",
      "site/create/index.html",
      "site/created/index.html",
    ]) {
      const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
      expect(html, page).toContain('data-boot="pending"');
    }
  });
});
