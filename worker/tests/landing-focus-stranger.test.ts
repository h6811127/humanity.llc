import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("landing focus stranger contract", () => {
  it("auto-enables focus only when device data exists", () => {
    const src = readFileSync(join(root, "site/js/landing-focus.mjs"), "utf8");
    expect(src).toContain("isLandingFocusModeFromStorage");
    expect(src).toContain('localStorage.setItem(LANDING_FOCUS_KEY, "1")');
    expect(src).toContain("hc-device-hub-changed");
  });

  it("landing index sets data-landing-focus before first paint", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain('data-landing-focus');
    expect(html).toContain('localStorage.getItem("hc_landing_focus")');
    expect(html).not.toMatch(/landing-docs-footer" hidden/);
  });
});
