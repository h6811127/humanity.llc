/**
 * WS-DOCKET-DG-v0 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCKET_DG_KIT_REL } from "./ws-docket-dg-kit-core.mjs";
import { validateDocketCase } from "../../site/js/docket-case-core.mjs";

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
export function assessWsDocketDgPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = fileExists(root, DOCKET_DG_KIT_REL);
  rows.push({
    id: "DG-kit",
    label: DOCKET_DG_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:dg-kit" : "missing — npm run ws-docket:dg-kit",
  });

  const core = fileExists(root, "site/js/docket-edit-proposal-core.mjs");
  rows.push({
    id: "DG-core",
    label: "docket-edit-proposal-core.mjs",
    met: core,
    detail: core ? "propose / approve / apply" : "missing core",
  });

  const test = fileExists(root, "worker/tests/docket-edit-proposal-core.test.ts");
  rows.push({
    id: "DG-test",
    label: "docket-edit-proposal-core.test.ts",
    met: test,
    detail: test ? "regression present" : "missing test",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "DG-npm-kit",
    label: "package.json ws-docket:dg-kit",
    met: pkg.includes('"ws-docket:dg-kit"'),
    detail: pkg.includes('"ws-docket:dg-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "DG-npm-preflight",
    label: "package.json ws-docket:dg-preflight",
    met: pkg.includes('"ws-docket:dg-preflight"'),
    detail: pkg.includes('"ws-docket:dg-preflight"') ? "wired" : "missing",
  });

  let altmanOk = false;
  let dualStewards = false;
  let hasProposal = false;
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "site/data/docket-case-altman.json"), "utf8")
    );
    const result = validateDocketCase(raw);
    altmanOk = result.ok;
    dualStewards = Array.isArray(raw.stewards) && raw.stewards.length >= 2;
    hasProposal = Array.isArray(raw.edit_proposals) && raw.edit_proposals.length >= 1;
  } catch {
    altmanOk = false;
  }
  rows.push({
    id: "DG-altman-valid",
    label: "altman case validates with DG fields",
    met: altmanOk,
    detail: altmanOk ? "validateDocketCase ok" : "fix invalid",
  });
  rows.push({
    id: "DG-altman-stewards",
    label: "altman has ≥2 stewards",
    met: dualStewards,
    detail: dualStewards ? "dual-gate ready" : "add second steward",
  });
  rows.push({
    id: "DG-altman-proposal",
    label: "altman ships sample edit_proposals[]",
    met: hasProposal,
    detail: hasProposal ? "fixture proposal present" : "add pending proposal",
  });

  const stewardJs = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
  const shellMounted = stewardJs.includes("mountDocketEditProposalsPanel");
  rows.push({
    id: "DG-steward-ui",
    label: "Steward shell mounts DG panel",
    met: shellMounted,
    detail: shellMounted ? "docket-steward-page.mjs" : "wire mountDocketEditProposalsPanel",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketDgPreflight>} report
 */
export function formatWsDocketDgPreflightReport(report) {
  const lines = [
    "WS-DOCKET-DG-v0 preflight — dual-gate edit proposals",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET-DG-v0 engineering preflight PASS"
      : "✗ WS-DOCKET-DG-v0 engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:dg-kit",
    "  npm run worker:test -- worker/tests/docket-edit-proposal-core.test.ts",
    "  Open /docket/altman/steward/ — approve as hc-reviewer"
  );
  return lines.join("\n");
}
