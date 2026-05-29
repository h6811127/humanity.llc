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

  it("stuck inbox backdrop is non-interactive when inbox sheet is closed (Step 1 CSS)", () => {
    const shellCss = fs.readFileSync(
      path.join(path.dirname(siteJsDir), "css/device-shell.css"),
      "utf8"
    );
    expect(shellCss).toMatch(
      /body:not\(\.device-inbox-sheet-open\)\s+\.device-inbox-backdrop\.is-visible[\s\S]*pointer-events:\s*none/
    );
  });

  it("hub-open paths import syncInboxBackdropForOpenHub (Step 1 / Check network taps)", () => {
    for (const file of [
      "device-hub-sheet.mjs",
      "device-inbox-sheet.mjs",
      "device-hub-ui.mjs",
      "device-status.mjs",
    ]) {
      const src = readSiteJs(file);
      expect(src, file).toMatch(/import[\s\S]*syncInboxBackdropForOpenHub/);
      expect(src, file).toContain("syncInboxBackdropForOpenHub(");
    }
  });
});
