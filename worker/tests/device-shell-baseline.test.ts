import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEVICE_SHELL_ASSET_VERSION,
  DEVICE_STATUS_SHELL_JS_FILES,
} from "../../site/js/device-status-shell-modules.mjs";
import {
  compareShellBaselineSnapshots,
  computeShellTransferBaseline,
  formatShellBaselineReport,
  shellBaselineToSnapshot,
  sumBaselineBytes,
} from "../scripts/device-shell-baseline-core.mjs";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const siteRoot = path.join(repoRoot, "site");
const snapshotPath = path.join(repoRoot, "worker/fixtures/device-shell-baseline.json");

function readSiteFileSize(relPath: string) {
  const full = path.join(siteRoot, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.statSync(full).size;
}

describe("device-shell-baseline-core", () => {
  it("computes non-zero transfer totals for the full shell graph", () => {
    const baseline = computeShellTransferBaseline({
      moduleFiles: DEVICE_STATUS_SHELL_JS_FILES,
      assetVersion: DEVICE_SHELL_ASSET_VERSION,
      readFileSize: readSiteFileSize,
    });

    expect(baseline.moduleCount).toBe(DEVICE_STATUS_SHELL_JS_FILES.length);
    expect(baseline.moduleCount).toBeGreaterThanOrEqual(60);
    expect(baseline.jsBytesTotal).toBeGreaterThan(100_000);
    expect(baseline.transferBytesShellGraph).toBeGreaterThan(baseline.jsBytesTotal);
    expect(baseline.transferBytesLandingFirstPaint).toBeGreaterThanOrEqual(
      baseline.transferBytesShellGraph
    );

    const missing = baseline.jsModules.filter((r) => r.missing);
    expect(missing, `missing modules: ${missing.map((r) => r.file).join(", ")}`).toHaveLength(0);
  });

  it("sumBaselineBytes ignores missing rows", () => {
    expect(
      sumBaselineBytes([
        { file: "a", bytes: 10 },
        { file: "b", bytes: 0, missing: true },
      ])
    ).toBe(10);
  });

  it("formatShellBaselineReport includes module count", () => {
    const baseline = computeShellTransferBaseline({
      moduleFiles: ["device-status-bootstrap.mjs"],
      assetVersion: 1,
      readFileSize: readSiteFileSize,
    });
    const report = formatShellBaselineReport(baseline);
    expect(report).toContain("Module count:");
    expect(report).toContain("1");
  });

  it("compareShellBaselineSnapshots detects module count drift", () => {
    const a = shellBaselineToSnapshot(
      computeShellTransferBaseline({
        moduleFiles: DEVICE_STATUS_SHELL_JS_FILES,
        assetVersion: DEVICE_SHELL_ASSET_VERSION,
        readFileSize: readSiteFileSize,
      })
    );
    const b = { ...a, module_count: a.module_count + 1 };
    const cmp = compareShellBaselineSnapshots(b, a);
    expect(cmp.ok).toBe(false);
    if (!cmp.ok) {
      expect(cmp.deltas.some((d) => d.includes("module_count"))).toBe(true);
    }
  });

  it("matches committed Phase 0 snapshot fixture", () => {
    expect(fs.existsSync(snapshotPath), "run npm run device-shell:baseline:write").toBe(true);

    const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const current = shellBaselineToSnapshot(
      computeShellTransferBaseline({
        moduleFiles: DEVICE_STATUS_SHELL_JS_FILES,
        assetVersion: DEVICE_SHELL_ASSET_VERSION,
        readFileSize: readSiteFileSize,
      })
    );

    const cmp = compareShellBaselineSnapshots(current, expected);
    expect(cmp.ok, cmp.ok ? "" : cmp.deltas?.join("; ")).toBe(true);
    expect(expected.schema).toBe("device_shell_baseline_v1");
    expect(expected.asset_version).toBe(DEVICE_SHELL_ASSET_VERSION);
  });
});
