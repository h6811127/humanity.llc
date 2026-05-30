import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  DEVICE_BOOT_LOCAL,
  DEVICE_BOOT_LOCAL_EVENT,
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
  DEVICE_BOOT_READY_EVENT,
  isDeviceBootLocalOrReadyState,
  isDeviceBootLocalState,
  isDeviceBootReadyState,
  isWalletShellPage,
  pageOwnsDeviceBootReady,
} from "../../site/js/device-shell-boot-core.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

describe("device-shell-boot-core", () => {
  it("defines pending, local, and ready boot states", () => {
    expect(DEVICE_BOOT_PENDING).toBe("pending");
    expect(DEVICE_BOOT_LOCAL).toBe("local");
    expect(DEVICE_BOOT_READY).toBe("ready");
    expect(DEVICE_BOOT_LOCAL_EVENT).toBe("hc-device-boot-local");
    expect(DEVICE_BOOT_READY_EVENT).toBe("hc-device-boot-ready");
    expect(isDeviceBootReadyState(DEVICE_BOOT_READY)).toBe(true);
    expect(isDeviceBootLocalState(DEVICE_BOOT_LOCAL)).toBe(true);
    expect(isDeviceBootLocalOrReadyState(DEVICE_BOOT_LOCAL)).toBe(true);
    expect(isDeviceBootLocalOrReadyState(DEVICE_BOOT_READY)).toBe(true);
    expect(isDeviceBootReadyState(DEVICE_BOOT_PENDING)).toBe(false);
  });

  it("defers boot ready on /created/ to the page module", () => {
    expect(pageOwnsDeviceBootReady("/created/")).toBe(true);
    expect(pageOwnsDeviceBootReady("/created/index.html")).toBe(true);
    expect(pageOwnsDeviceBootReady("/")).toBe(false);
    expect(pageOwnsDeviceBootReady("/wallet/")).toBe(false);
  });

  it("recognizes wallet shell pathname", () => {
    expect(isWalletShellPage("/wallet/")).toBe(true);
    expect(isWalletShellPage("/wallet/index.html")).toBe(true);
    expect(isWalletShellPage("/")).toBe(false);
  });
});

describe("device-shell boot CSS (RC-1 · RC-17)", () => {
  it("gates ready-only chrome and local-gated wallet saved list", () => {
    const css = fs.readFileSync(path.join(repoRoot, "site/css/device-shell.css"), "utf8");
    expect(css).toContain("body[data-boot=\"pending\"] .device-boot-gated");
    expect(css).toContain("body[data-boot=\"local\"] .device-boot-gated");
    expect(css).toContain("body[data-boot=\"ready\"] .device-boot-gated");
    expect(css).toContain("body[data-boot=\"local\"] .device-boot-local-gated");
    expect(css).toContain("body[data-boot=\"ready\"] .device-boot-local-gated");
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
