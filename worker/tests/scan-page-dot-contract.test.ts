import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SCAN_PASS_CSS } from "../src/resolver/scan-pass-styles";
import { SCAN_UI_VERSION } from "../src/resolver/scan-html";
import { SHOWCASE_PROFILE } from "./fixtures/scan-showcase-fixtures";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("scan page device dot contract", () => {
  it("ships progressive dot UI version", () => {
    expect(SCAN_UI_VERSION).toBe("pass-v37");
  });

  it("bundles glance popover CSS from site/scan-pass.css", () => {
    expect(SCAN_PASS_CSS).toContain(".scan-page-dot-glance");
    expect(SCAN_PASS_CSS).toContain("scan-none-dot-attention");
    expect(SCAN_PASS_CSS).toContain("steward-dot-celebrate");
    expect(SCAN_PASS_CSS).toContain(".scan-hero-wordmark");
    expect(SCAN_PASS_CSS).toContain(".scan-page-dot-glance-now");
    expect(SCAN_PASS_CSS).toContain("scan-live-check--pending");
    expect(SCAN_PASS_CSS).toContain("scan-page-dot--settle");
    expect(SCAN_PASS_CSS).toContain("scan-actor-band");
    expect(SCAN_PASS_CSS).toContain("--surface-popover-bg");
    expect(SCAN_PASS_CSS).toContain(".hc-emphasis-card");
    expect(SCAN_PASS_CSS).toContain("--hc-emphasis-card-shadow");
    expect(SCAN_PASS_CSS).toContain("--hc-emphasis-card-fill-active-glass");
    expect(SCAN_PASS_CSS).toContain("backdrop-filter: var(--hc-emphasis-card-backdrop)");
    expect(SCAN_PASS_CSS).toMatch(
      /html\[data-theme="dark"\] \.hc-emphasis-card--info[\s\S]*--hc-emphasis-card-fill-info-glass/
    );
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-shadow");
    expect(SCAN_PASS_CSS).toContain("scan-hero-settle-pulse");
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-hero\.scan-status-panel[\s\S]*box-shadow:\s*var\(--hc-scan-hero-shadow\)/
    );
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-fill");
    expect(SCAN_PASS_CSS).toMatch(
      /html\[data-theme="dark"\] \.scan-hero\.scan-status-panel[\s\S]*var\(--hc-scan-hero-fill\)/
    );
    expect(SCAN_PASS_CSS).not.toContain("rgba(10, 132, 255, 0.08)");
    const src = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(src).toContain(".scan-page-dot-glance");
  });

  it("hero host is text-only wordmark (dot in page chrome only)", () => {
    const src = readFileSync(join(root, "worker/src/resolver/scan-html.ts"), "utf8");
    expect(src).toContain("renderScanHeroHost()");
    expect(src).toContain("scan-hero-wordmark");
    expect(src).not.toMatch(
      /scan-hero-host"><span class="pass-dot"/
    );
  });

  it("loads versioned scan-tab-keys bundle", () => {
    const src = readFileSync(join(root, "worker/src/resolver/scan-html.ts"), "utf8");
    expect(src).toContain("scan-tab-keys.mjs?v=8");
    expect(src).toContain("scan-page-dot-glance");
  });

  it("loads scan-tab-keys before vouch-issue so rehydrate blocks vouch bootstrap", () => {
    const src = readFileSync(join(root, "worker/src/resolver/scan-html.ts"), "utf8");
    const tabKeysIdx = src.indexOf("renderScanTabKeysScript");
    const vouchIdx = src.indexOf("renderVouchIssuanceScript");
    const liveIdx = src.indexOf("renderLiveControlScript");
    expect(tabKeysIdx).toBeGreaterThan(-1);
    expect(vouchIdx).toBeGreaterThan(tabKeysIdx);
    expect(liveIdx).toBeGreaterThan(tabKeysIdx);
  });

  it("scan-tab-keys imports scan-page-dot module", () => {
    const src = readFileSync(join(root, "site/js/scan-tab-keys.mjs"), "utf8");
    expect(src).toContain("./scan-page-dot.mjs?v=8");
  });

  it("ships Playwright scan fixture with progressive dot markup", () => {
    const html = readFileSync(
      join(root, "site/e2e-fixtures/scan-active.html"),
      "utf8"
    );
    expect(html).toContain('id="scan-page-dot"');
    expect(html).toContain('id="scan-page-dot-glance"');
    expect(html).toContain('class="scan-hero-host scan-hero-wordmark"');
    expect(html).toContain("scan-tab-keys.mjs?v=8");
    expect(html).toContain(`data-profile-id="${SHOWCASE_PROFILE}"`);
  });
});
