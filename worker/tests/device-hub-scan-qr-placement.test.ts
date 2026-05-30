import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HUB_CHROME_SCAN_QR_ARIA,
  HUB_GLANCE_SCAN_QR_SUB,
  HUB_GLANCE_SCAN_QR_TITLE,
} from "../../site/js/device-ownership-copy-core.mjs";

const root = process.cwd();
const hubPages = ["site/index.html", "site/create/index.html", "site/wallet/index.html"];
const shellPages = [...hubPages, "site/created/index.html"];

function readPage(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("hub scan QR placement", () => {
  it("places steward tools strip under saved items, not in restore group", () => {
    for (const path of hubPages) {
      const html = readPage(path);
      expect(html, path).toContain('id="device-hub-steward-tools"');
      expect(html, path).toContain("data-hub-steward-tools");

      const savedSection = html.match(
        /id="device-hub-saved-items-section"[\s\S]*?<\/section>/
      )?.[0];
      expect(savedSection, path).toBeTruthy();
      expect(savedSection).toContain("device-hub-steward-tools");
      expect(savedSection).toContain('id="hub-scan-qr-btn"');
      expect(savedSection).toContain('id="device-hub-steward-vouch-guidance"');

      const restoreGroup = html.match(
        /data-hub-group="import" data-hub-restore-always[\s\S]*?(?=<div class="device-hub-group|<\/section>)/ 
      )?.[0];
      expect(restoreGroup, path).toBeTruthy();
      expect(restoreGroup).not.toContain('id="hub-scan-qr-btn"');
      expect(restoreGroup).not.toContain('id="device-hub-steward-vouch-guidance"');
    }
  });

  it("exports glance scan copy for steward fast path", () => {
    expect(HUB_GLANCE_SCAN_QR_TITLE).toContain("Scan");
    expect(HUB_GLANCE_SCAN_QR_SUB.toLowerCase()).toContain("vouch");
  });

  it("renders scan glance row when wallet has saved cards", () => {
    const glanceSrc = readPage("site/js/device-hub-glance.mjs");
    expect(glanceSrc).toContain("appendScanGlanceRow");
    expect(glanceSrc).toContain("HUB_GLANCE_SCAN_QR_TITLE");
    expect(glanceSrc).toContain("openHubQrScanner");
    expect(glanceSrc).toContain("shouldShowHubQrScanner");
  });

  it("syncs steward tools strip visibility with scanner button", () => {
    const scannerSrc = readPage("site/js/device-hub-qr-scanner.mjs");
    expect(scannerSrc).toContain('getElementById("device-hub-steward-tools")');
    expect(scannerSrc).toContain('getElementById("shell-scan-qr-btn")');
    expect(scannerSrc).toContain("pickQrScanBackend");
    expect(scannerSrc).toContain("startJsQrDetectLoop");
    expect(scannerSrc).toContain("openHubQrScanner");
  });

  it("mounts conditional chrome scan icon on shell pages (Phase B)", () => {
    for (const path of shellPages) {
      const html = readPage(path);
      expect(html, path).toContain('id="shell-scan-qr-btn"');
      expect(html, path).toContain("shell-chrome-primary-row");
      expect(html, path).toContain("shell-scan-qr-btn");
    }
    const css = readPage("site/css/device-shell.css");
    expect(css).toContain(".shell-scan-qr-btn");
    expect(HUB_CHROME_SCAN_QR_ARIA.toLowerCase()).toContain("vouch");
  });

  it("includes scanner dialog on created for chrome scan entry", () => {
    const html = readPage("site/created/index.html");
    expect(html).toContain('id="device-hub-qr-scanner"');
    expect(html).toContain('id="shell-scan-qr-btn"');
  });
});
