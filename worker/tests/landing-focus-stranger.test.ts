import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("landing focus stranger contract", () => {
  it("auto-enables focus only when device data exists", () => {
    const src = readFileSync(join(root, "site/js/landing-focus.mjs"), "utf8");
    expect(src).toContain("hasDeviceData()");
    expect(src).toContain('localStorage.setItem(FOCUS_KEY, "1")');
    expect(src).toContain("hc-device-hub-changed");
  });
});
