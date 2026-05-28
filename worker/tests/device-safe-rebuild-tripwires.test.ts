import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

function readSiteJs(filename) {
  return fs.readFileSync(path.join(siteJsDir, filename), "utf8");
}

describe("UI/UX safe rebuild tripwires (post-plan)", () => {
  it("device-status.mjs does not auto-start the global OS coordinator", () => {
    const src = readSiteJs("device-status.mjs");
    expect(src).not.toMatch(/\binitDeviceOsCoordinator\s*\(/);
    expect(src).not.toMatch(/device-os-coordinator\.mjs/);
  });

  it("status bootstrap and shell chrome avoid document scroll-edge listeners", () => {
    for (const file of ["device-status.mjs", "device-shell-chrome.mjs"]) {
      const src = readSiteJs(file);
      expect(src, file).not.toMatch(/addEventListener\s*\(\s*["']scroll["']/);
      expect(src, file).not.toContain("initScrollEdgeChrome");
      expect(src, file).not.toContain("top-chrome--edge-hidden");
    }
  });
});
