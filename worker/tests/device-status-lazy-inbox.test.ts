import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device-status lazy inbox (P2 hardening)", () => {
  it("device-status.mjs does not statically import device-inbox-sheet.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-inbox-sheet\.mjs/i);
    expect(src).toMatch(/device-inbox-sheet-loader\.mjs/);
  });

  it("device-hub-glance.mjs does not statically import device-inbox-sheet.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-hub-glance.mjs"), "utf8");
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-inbox-sheet\.mjs/i);
    expect(src).toMatch(/device-inbox-sheet-loader\.mjs/);
  });

  it("loader uses dynamic import for inbox sheet", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-inbox-sheet-loader.mjs"), "utf8");
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-inbox-sheet\.mjs/i);
  });

  it("device-status.mjs does not statically import device-inbox.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-inbox\.mjs/i);
    expect(src).toMatch(/device-inbox-loader\.mjs/);
  });

  it("device-chrome-refresh.mjs does not statically import device-inbox-sheet.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-chrome-refresh.mjs"), "utf8");
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-inbox-sheet\.mjs/i);
    expect(src).toMatch(/device-inbox-sheet-loader\.mjs/);
  });

  it("device-inbox-loader uses dynamic import for device-inbox", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-inbox-loader.mjs"), "utf8");
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-inbox\.mjs/i);
  });

  it("device-status.mjs does not statically import device-hub-sheet.mjs", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-hub-sheet\.mjs/i);
    expect(src).toMatch(/device-hub-sheet-loader\.mjs/);
  });

  it("device-hub-sheet-loader uses dynamic import for hub sheet", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-hub-sheet-loader.mjs"), "utf8");
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-hub-sheet\.mjs/i);
  });
});

