import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const siteJsDir = path.join(repoRoot, "site/js");
const deviceShellCss = path.join(repoRoot, "site/css/device-shell.css");

describe("device-shell-chrome inset (Step 5 safe rebuild)", () => {
  it("uses monotonic chrome inset floor without document scroll-edge chrome", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-shell-chrome.mjs"), "utf8");
    expect(src).toContain("chromeInsetFloor");
    expect(src).not.toMatch(/addEventListener\s*\(\s*["']scroll["']/);
    expect(src).not.toContain("initScrollEdgeChrome");
    expect(src).not.toContain("top-chrome--edge-hidden");
    expect(src).toContain("chromeInsetPx");
    expect(fs.readFileSync(deviceShellCss, "utf8")).toMatch(
      /--shell-chrome-h:\s*calc\(56px \+ env\(safe-area-inset-top/
    );
  });

  it("landing ships has-shell-chrome on body for first-paint chrome inset", () => {
    const landingHtml = fs.readFileSync(path.join(repoRoot, "site/index.html"), "utf8");
    expect(landingHtml).toMatch(/<body[^>]*\bhas-shell-chrome\b/);
  });
});
