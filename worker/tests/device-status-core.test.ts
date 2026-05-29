import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

describe("device-status-core", () => {
  it("bootstrap-inner loads core before full status module", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-status-bootstrap-inner.mjs"),
      "utf8"
    );
    const coreIdx = src.indexOf("device-status-core.mjs");
    const statusIdx = src.indexOf("device-status.mjs");
    expect(coreIdx).toBeGreaterThan(-1);
    expect(statusIdx).toBeGreaterThan(coreIdx);
    expect(src).toMatch(/import\(statusCoreUrl\.href\)[\s\S]*import\(statusModuleUrl\.href\)/);
  });

  it("device-status.mjs does not register dot click (core owns it)", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(/dotBtn\?\.addEventListener\("click"/);
    expect(src).toMatch(/device-status-core\.mjs/);
  });

  it("core lazy-loads hub sheet module", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status-core.mjs"), "utf8");
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-hub-sheet\.mjs/i);
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-hub-sheet\.mjs/i);
  });
});
