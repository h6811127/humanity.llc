import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device-status lazy browser notifications (Shell P2)", () => {
  it("device-status.mjs does not statically import device-browser-notifications.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(
      /^\s*import\s+.+\s+from\s+["']\.\/device-browser-notifications\.mjs/i
    );
    expect(src).toMatch(/device-browser-notifications-loader\.mjs/);
    expect(src).toMatch(/initBrowserNotifications\(\)/);
  });

  it("device-hub-ui.mjs does not statically import device-browser-notifications.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-hub-ui.mjs"), "utf8");
    expect(src).not.toMatch(
      /^\s*import\s+.+\s+from\s+["']\.\/device-browser-notifications\.mjs/i
    );
    expect(src).toMatch(/device-browser-notifications-loader\.mjs/);
  });

  it("loader uses dynamic import for browser notifications", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-browser-notifications-loader.mjs"),
      "utf8"
    );
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-browser-notifications\.mjs/i);
  });

  it("device-browser-notifications.mjs does not self-init on load", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-browser-notifications.mjs"),
      "utf8"
    );
    expect(src.trim()).not.toMatch(/initBrowserNotifications\(\);\s*$/);
  });
});
