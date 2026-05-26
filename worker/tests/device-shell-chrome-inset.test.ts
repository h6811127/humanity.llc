import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device-shell-chrome inset (Step 5 safe rebuild)", () => {
  it("uses monotonic chrome inset floor without document scroll-edge chrome", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-shell-chrome.mjs"), "utf8");
    expect(src).toContain("chromeInsetFloor");
    expect(src).not.toMatch(/addEventListener\s*\(\s*["']scroll["']/);
    expect(src).not.toContain("initScrollEdgeChrome");
    expect(src).not.toContain("top-chrome--edge-hidden");
  });
});
