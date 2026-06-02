/**
 * Phase 0 smooth mode — measure device shell JS/CSS transfer baseline.
 *
 * Usage:
 *   npm run device-shell:baseline
 *   npm run device-shell:baseline:write
 *
 * @see docs/DEVICE_LITE_MOBILE_PLAN.md § Phase 0
 * @see docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md
 */
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
  deviceSmoothPhase0HumanNextSteps,
  formatShellBaselineReport,
  shellBaselineToSnapshot,
} from "./device-shell-baseline-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const siteRoot = path.join(repoRoot, "site");
const snapshotPath = path.join(repoRoot, "worker/fixtures/device-shell-baseline.json");

/**
 * @param {string} relPath relative to site/
 */
function readSiteFileSize(relPath) {
  const full = path.join(siteRoot, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.statSync(full).size;
}

/**
 * @param {{ write?: boolean; json?: boolean }} [opts]
 */
export function runDeviceShellBaseline(opts = {}) {
  const baseline = computeShellTransferBaseline({
    moduleFiles: DEVICE_STATUS_SHELL_JS_FILES,
    assetVersion: DEVICE_SHELL_ASSET_VERSION,
    readFileSize: readSiteFileSize,
  });

  const missing = [...baseline.jsModules, ...baseline.shellCss, ...baseline.landingCss].filter(
    (r) => r.missing
  );
  if (missing.length) {
    console.error("Missing baseline files:");
    for (const row of missing) {
      console.error(`  ${row.file}`);
    }
    process.exit(1);
  }

  const snapshot = shellBaselineToSnapshot(baseline);

  if (opts.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return { baseline, snapshot, ok: true };
  }

  console.log(formatShellBaselineReport(baseline));
  console.log(`\nSnapshot: ${path.relative(repoRoot, snapshotPath)}`);

  if (opts.write) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log("\n✅ Wrote baseline snapshot.");
    return { baseline, snapshot, ok: true };
  }

  if (!fs.existsSync(snapshotPath)) {
    console.error("\n❌ No committed snapshot. Run: npm run device-shell:baseline:write");
    process.exit(1);
  }

  const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const cmp = compareShellBaselineSnapshots(snapshot, expected);
  if (!cmp.ok) {
    console.error("\n❌ Baseline drift (run device-shell:baseline:write after intentional graph changes):");
    for (const line of cmp.deltas) {
      console.error(`  • ${line}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Baseline matches committed snapshot.");
  for (const line of deviceSmoothPhase0HumanNextSteps()) {
    console.log(line);
  }
  return { baseline, snapshot, ok: true };
}

function main() {
  runDeviceShellBaseline({
    write: process.argv.includes("--write"),
    json: process.argv.includes("--json"),
  });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
