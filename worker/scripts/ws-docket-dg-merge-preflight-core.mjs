/**
 * WS-DOCKET-DG-merge-v0 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_MERGE_KIT_REL,
  buildDocketMergePack,
  validateDocketMergePack,
} from "../../site/js/docket-edit-proposal-merge-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketDgMergePreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_MERGE_KIT_REL));
  rows.push({
    id: "MG-kit",
    label: DOCKET_MERGE_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:dg-merge-kit" : "missing — npm run ws-docket:dg-merge-kit",
  });

  const core = existsSync(join(root, "site/js/docket-edit-proposal-merge-core.mjs"));
  rows.push({
    id: "MG-core",
    label: "docket-edit-proposal-merge-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "MG-npm-kit",
    label: "package.json ws-docket:dg-merge-kit",
    met: pkg.includes('"ws-docket:dg-merge-kit"'),
    detail: pkg.includes('"ws-docket:dg-merge-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "MG-npm-preflight",
    label: "package.json ws-docket:dg-merge-preflight",
    met: pkg.includes('"ws-docket:dg-merge-preflight"'),
    detail: pkg.includes('"ws-docket:dg-merge-preflight"') ? "wired" : "missing",
  });

  const sampleCase = {
    id: "altman",
    status: "open",
    note: "n",
    action: { label: "Open" },
    counts: [{ id: "c1", title: "T", body: "B" }],
  };
  const pack = buildDocketMergePack({
    caseId: "altman",
    fullCase: sampleCase,
    proposals: [
      {
        id: "p1",
        field_path: "note",
        summary: "s",
        before: "n",
        after: "n2",
        status: "applied",
        approvals: ["a", "b"],
      },
    ],
  });
  const packOk = validateDocketMergePack(pack).ok;
  rows.push({
    id: "MG-pack-valid",
    label: "merge pack validates",
    met: packOk && pack.writes_published_json === false,
    detail: packOk ? "human-gated" : "invalid",
  });

  const stewardJs = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
  rows.push({
    id: "MG-steward-ui",
    label: "Steward downloads merge pack",
    met: stewardJs.includes("buildDocketMergePack") && stewardJs.includes("merge-pack"),
    detail:
      stewardJs.includes("buildDocketMergePack") && stewardJs.includes("merge-pack")
        ? "wired"
        : "missing",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketDgMergePreflight>} report
 */
export function formatWsDocketDgMergePreflightReport(report) {
  const lines = [
    "WS-DOCKET-DG-merge-v0 preflight — human-gated merge pack",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET-DG-merge-v0 engineering preflight PASS"
      : "✗ WS-DOCKET-DG-merge-v0 engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:dg-merge-kit",
    "  Open /docket/altman/steward/#merge-pack",
    "  DG-store-v0 Worker store is available; merge remains human-gated"
  );
  return lines.join("\n");
}
