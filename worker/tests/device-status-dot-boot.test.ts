import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  DEVICE_DOT_BOOT_PENDING,
  DEVICE_DOT_BOOT_READY,
  isDotBootstrapSettled,
  markDotBootstrapSettled,
  resetDotBootstrapSettledForTests,
  shouldDeferCoreDotPaint,
} from "../../site/js/device-status-dot-boot-core.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

describe("device-status-dot-boot-core", () => {
  it("defers core dot paint by default (RC-3)", () => {
    expect(shouldDeferCoreDotPaint()).toBe(true);
    expect(DEVICE_DOT_BOOT_PENDING).toBe("pending");
    expect(DEVICE_DOT_BOOT_READY).toBe("ready");
  });

  it("tracks bootstrap settled flag", () => {
    resetDotBootstrapSettledForTests();
    expect(isDotBootstrapSettled()).toBe(false);
    markDotBootstrapSettled();
    expect(isDotBootstrapSettled()).toBe(true);
    resetDotBootstrapSettledForTests();
    expect(isDotBootstrapSettled()).toBe(false);
  });
});

describe("device-status dot boot wiring (RC-3)", () => {
  it("core skips initial applyCoreDot when deferring", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "site/js/device-status-core.mjs"),
      "utf8"
    );
    expect(src).toContain("markDotBootPending()");
    expect(src).toContain("if (!shouldDeferCoreDotPaint())");
  });

  it("full status awaits health before first chrome refresh", () => {
    const src = fs.readFileSync(path.join(repoRoot, "site/js/device-status.mjs"), "utf8");
    expect(src).toMatch(/await refreshNetwork\(\)/);
    expect(src).toContain("markDotBootstrapSettled()");
    expect(src).toContain("markDotBootReadyIfSettled()");
  });

  it("CSS hides dot while data-dot-boot=pending", () => {
    const css = fs.readFileSync(path.join(repoRoot, "site/css/device-shell.css"), "utf8");
    expect(css).toContain('#brand-status-dot-btn[data-dot-boot="pending"] .shell-status-dot');
  });

  it("shell pages start with data-dot-boot=pending on dot button", () => {
    for (const page of [
      "site/index.html",
      "site/wallet/index.html",
      "site/create/index.html",
      "site/created/index.html",
    ]) {
      const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
      expect(html, page).toContain('id="brand-status-dot-btn"');
      expect(html, page).toContain('data-dot-boot="pending"');
    }
  });
});
