import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HUB_RESTORE_ALWAYS_ATTR,
  HUB_STRANGER_EMPTY_CLASS,
} from "../../site/js/device-hub-stranger-empty-core.mjs";
import {
  HUB_RESTORE_GROUP_LABEL,
  HUB_RESTORE_IMPORT_HINT,
  HUB_RESTORE_IMPORT_SUMMARY,
} from "../../site/js/device-ownership-copy-core.mjs";

const root = process.cwd();
const hubPages = ["site/index.html", "site/create/index.html", "site/wallet/index.html"];

function readPage(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("hub restore always visible (Phase 4)", () => {
  it("marks import groups with data-hub-restore-always on shell hub pages", () => {
    for (const path of hubPages) {
      const html = readPage(path);
      expect(html, path).toContain(`${HUB_RESTORE_ALWAYS_ATTR}`);
      expect(html, path).toContain(
        'data-hub-group="import" data-hub-restore-always'
      );
      expect(html, path).not.toContain(
        'data-hub-group="import" data-hub-stranger-empty-hide'
      );
    }
  });

  it("exempts restore-always groups from stranger-empty hide in device-shell.css", () => {
    const css = readPage("site/css/device-shell.css");
    expect(css).toContain(`.${HUB_STRANGER_EMPTY_CLASS} [${HUB_RESTORE_ALWAYS_ATTR}]`);
    expect(css).toMatch(
      new RegExp(
        `\\.${HUB_STRANGER_EMPTY_CLASS} \\[${HUB_RESTORE_ALWAYS_ATTR}\\][\\s\\S]*display:\\s*block !important`
      )
    );
  });

  it("exports converged hub restore import hint copy", () => {
    expect(HUB_RESTORE_IMPORT_HINT).toContain(".hcbackup.json");
    expect(HUB_RESTORE_IMPORT_HINT.toLowerCase()).not.toContain("signing key");
    expect(HUB_RESTORE_IMPORT_SUMMARY).toContain("Encrypted backup");
  });

  it("includes hub recovery import on shell hub pages", () => {
    for (const path of hubPages) {
      const html = readPage(path);
      expect(html, path).toContain('id="hub-recovery-import-form"');
      expect(html, path).toContain("Import recovery code");
      expect(html, path).toContain('id="hub-open-scan-form"');
      expect(html, path).toContain("Open scan link");
      expect(html, path).not.toContain('id="hub-scan-qr-btn"');
      expect(html, path).toContain('id="device-hub-qr-scanner"');
      expect(html, path).toContain('id="device-hub-steward-vouch-guidance"');
      expect(html, path).toContain('id="device-hub-restore-group-label"');
      expect(html, path).toContain("Restore &amp; scan");
    }
    const recoverySrc = readPage("site/js/device-hub-import-recovery.mjs");
    expect(recoverySrc).toContain("initHubRecoveryImport");
    const openScanSrc = readPage("site/js/device-hub-open-scan.mjs");
    expect(openScanSrc).toContain("initHubOpenScanLink");
    const qrScannerSrc = readPage("site/js/device-hub-qr-scanner.mjs");
    expect(qrScannerSrc).toContain("initHubQrScanner");
    const guidanceSrc = readPage("site/js/device-hub-steward-vouch-guidance.mjs");
    expect(guidanceSrc).toContain("initHubStewardVouchGuidance");
    expect(guidanceSrc).toContain("HUB_RESTORE_GROUP_LABEL");
  });

  it("exports converged restore group label copy (S4)", () => {
    expect(HUB_RESTORE_GROUP_LABEL).toContain("Restore");
    expect(HUB_RESTORE_GROUP_LABEL).toContain("scan");
  });

  it("uses empty hub import hint placeholders hydrated by device-hub-import (Phase 4 step 2)", () => {
    for (const path of hubPages) {
      const html = readPage(path);
      expect(html, path).toContain('id="hub-import-form-hint"');
      expect(html, path).toContain("hub-import-list-sub");
      expect(html, path).not.toMatch(/Encrypted\s+\.hcbackup/i);
    }
    const importSrc = readPage("site/js/device-hub-import.mjs");
    expect(importSrc).toContain("HUB_RESTORE_IMPORT_HINT");
    expect(importSrc).toContain("applyHubRestoreImportCopy");
  });
});
