/**
 * WS-DOCKET-QR-v0 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCKET_QR_KIT_REL } from "./ws-docket-qr-kit-core.mjs";
import {
  classifyDocketLiveObjectScanMode,
  isDocketChildObjectScanPath,
  upgradePublicDocketCaseLiveObjectToChildQr,
} from "../../site/js/docket-live-object-bind-core.mjs";

/**
 * @param {string} root
 * @param {string} rel
 */
function fileExists(root, rel) {
  return existsSync(join(root, rel));
}

/**
 * @param {string} root
 */
export function assessWsDocketQrPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = fileExists(root, DOCKET_QR_KIT_REL);
  rows.push({
    id: "QR-kit",
    label: DOCKET_QR_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:qr-kit" : "missing — npm run ws-docket:qr-kit",
  });

  const core = fileExists(root, "site/js/docket-live-object-bind-core.mjs");
  rows.push({
    id: "QR-core",
    label: "docket-live-object-bind-core.mjs",
    met: core,
    detail: core ? "upgrade / classify / session preview" : "missing core",
  });

  const steward = fileExists(root, "site/js/docket-steward-page.mjs");
  let mountsPanel = false;
  if (steward) {
    const src = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
    mountsPanel = src.includes("mountDocketQrUpgradePanel");
  }
  rows.push({
    id: "QR-steward",
    label: "steward shell mounts QR panel",
    met: mountsPanel,
    detail: mountsPanel ? "mountDocketQrUpgradePanel" : "missing mount",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "QR-npm-kit",
    label: "package.json ws-docket:qr-kit",
    met: pkg.includes('"ws-docket:qr-kit"'),
    detail: pkg.includes('"ws-docket:qr-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "QR-npm-preflight",
    label: "package.json ws-docket:qr-preflight",
    met: pkg.includes('"ws-docket:qr-preflight"'),
    detail: pkg.includes('"ws-docket:qr-preflight"') ? "wired" : "missing",
  });

  let upgradeOk = false;
  try {
    const upgraded = upgradePublicDocketCaseLiveObjectToChildQr("netanyahu", {
      profileId: "demoProfile01",
      qrId: "qr_demo_1",
    });
    upgradeOk =
      upgraded.discovery_opt_in === false &&
      upgraded.object_id === "obj_docket_casefile_netanyahu" &&
      isDocketChildObjectScanPath(String(upgraded.scan_path)) &&
      classifyDocketLiveObjectScanMode(String(upgraded.scan_path), "netanyahu") ===
        "child_qr";
  } catch {
    upgradeOk = false;
  }
  rows.push({
    id: "QR-upgrade-helper",
    label: "upgradePublicDocketCaseLiveObjectToChildQr",
    met: upgradeOk,
    detail: upgradeOk ? "child_qr shape + discovery off" : "helper failed",
  });

  let interimPublished = false;
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "site/data/docket-case-netanyahu.json"), "utf8")
    );
    const scan = String(raw?.live_object?.scan_path ?? "");
    interimPublished =
      classifyDocketLiveObjectScanMode(scan, "netanyahu") === "interim" &&
      raw?.live_object?.discovery_opt_in === false;
  } catch {
    interimPublished = false;
  }
  rows.push({
    id: "QR-published-interim",
    label: "netanyahu published bind stays interim",
    met: interimPublished,
    detail: interimPublished
      ? "/docket/netanyahu/ · discovery false"
      : "expected interim case URL bind",
  });

  const caseCore = fileExists(root, "site/js/docket-case-core.mjs");
  let shellHasAnchor = false;
  if (caseCore) {
    const src = readFileSync(join(root, "site/js/docket-case-core.mjs"), "utf8");
    shellHasAnchor =
      src.includes('id="qr-upgrade"') && src.includes("docket-qr-upgrade-root");
  }
  rows.push({
    id: "QR-shell-anchor",
    label: "steward shell #qr-upgrade anchor",
    met: shellHasAnchor,
    detail: shellHasAnchor ? "present" : "missing",
  });

  const engineeringMet = rows.every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * @param {ReturnType<typeof assessWsDocketQrPreflight>} report
 */
export function formatWsDocketQrPreflight(report) {
  const lines = [
    "WS-DOCKET-QR-v0 preflight — child-object QR upgrade preview",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push("");
  lines.push(
    report.engineeringMet
      ? "✅ WS-DOCKET-QR-v0 engineering preflight PASS"
      : "✗ WS-DOCKET-QR-v0 engineering preflight FAIL — fix ☐ rows above"
  );
  lines.push("");
  lines.push("Next:");
  lines.push("  npm run ws-docket:qr-kit");
  lines.push("  npm run worker:test -- worker/tests/docket-live-object-bind-core.test.ts");
  lines.push("  Open /docket/netanyahu/steward/#qr-upgrade");
  return lines.join("\n");
}
