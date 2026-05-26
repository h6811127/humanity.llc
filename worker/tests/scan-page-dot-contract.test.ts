import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SCAN_PASS_CSS } from "../src/resolver/scan-pass-styles";
import { SCAN_UI_VERSION } from "../src/resolver/scan-html";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("scan page device dot contract", () => {
  it("ships progressive dot UI version", () => {
    expect(SCAN_UI_VERSION).toBe("pass-v29");
  });

  it("bundles glance popover CSS from site/scan-pass.css", () => {
    expect(SCAN_PASS_CSS).toContain(".scan-page-dot-glance");
    expect(SCAN_PASS_CSS).toContain("--surface-popover-bg");
    const src = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(src).toContain(".scan-page-dot-glance");
  });

  it("loads versioned scan-tab-keys bundle", () => {
    const src = readFileSync(join(root, "worker/src/resolver/scan-html.ts"), "utf8");
    expect(src).toContain("scan-tab-keys.mjs?v=6");
    expect(src).toContain("scan-page-dot-glance");
  });

  it("scan-tab-keys imports scan-page-dot module", () => {
    const src = readFileSync(join(root, "site/js/scan-tab-keys.mjs"), "utf8");
    expect(src).toContain("./scan-page-dot.mjs?v=3");
  });
});
