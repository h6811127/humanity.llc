/**
 * WS-DOCKET-DG-store-v0 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_DG_STORE_KIT_REL,
  buildDocketEditProposalStoreDocument,
  validateDocketEditProposalStoreDocument,
} from "../../site/js/docket-edit-proposal-store-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketDgStorePreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_DG_STORE_KIT_REL));
  rows.push({
    id: "ST-kit",
    label: DOCKET_DG_STORE_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:dg-store-kit" : "missing — npm run ws-docket:dg-store-kit",
  });

  const core = existsSync(join(root, "site/js/docket-edit-proposal-store-core.mjs"));
  rows.push({
    id: "ST-core",
    label: "docket-edit-proposal-store-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const migration = existsSync(
    join(root, "worker/migrations/0039_docket_edit_proposals.sql")
  );
  rows.push({
    id: "ST-migration",
    label: "0039_docket_edit_proposals.sql",
    met: migration,
    detail: migration ? "present" : "missing",
  });

  const handler = existsSync(
    join(root, "worker/src/resolver/docket-edit-proposals.ts")
  );
  rows.push({
    id: "ST-handler",
    label: "docket-edit-proposals.ts",
    met: handler,
    detail: handler ? "present" : "missing",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "ST-npm-kit",
    label: "package.json ws-docket:dg-store-kit",
    met: pkg.includes('"ws-docket:dg-store-kit"'),
    detail: pkg.includes('"ws-docket:dg-store-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "ST-npm-preflight",
    label: "package.json ws-docket:dg-store-preflight",
    met: pkg.includes('"ws-docket:dg-store-preflight"'),
    detail: pkg.includes('"ws-docket:dg-store-preflight"') ? "wired" : "missing",
  });

  const indexTs = readFileSync(join(root, "worker/src/index.ts"), "utf8");
  rows.push({
    id: "ST-route",
    label: "Worker route edit-proposals",
    met:
      indexTs.includes("handleGetDocketEditProposals") &&
      indexTs.includes("handlePutDocketEditProposals"),
    detail:
      indexTs.includes("handleGetDocketEditProposals") &&
      indexTs.includes("handlePutDocketEditProposals")
        ? "wired"
        : "missing",
  });

  const doc = buildDocketEditProposalStoreDocument({
    caseId: "altman",
    proposals: [],
    updatedAt: "2026-07-16T00:00:00.000Z",
  });
  const docOk =
    validateDocketEditProposalStoreDocument(doc).ok &&
    doc.writes_published_json === false;
  rows.push({
    id: "ST-doc",
    label: "store document validates",
    met: docOk,
    detail: docOk ? "no published rewrite" : "invalid",
  });

  const stewardJs = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
  rows.push({
    id: "ST-steward-ui",
    label: "Steward syncs Worker store",
    met:
      stewardJs.includes("putDocketEditProposalsToStore") &&
      stewardJs.includes("fetchDocketEditProposalsFromStore"),
    detail:
      stewardJs.includes("putDocketEditProposalsToStore") &&
      stewardJs.includes("fetchDocketEditProposalsFromStore")
        ? "wired"
        : "missing",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketDgStorePreflight>} report
 */
export function formatWsDocketDgStorePreflightReport(report) {
  const lines = [
    "WS-DOCKET-DG-store-v0 preflight — Worker store for signed proposals",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET-DG-store-v0 engineering preflight PASS"
      : "✗ WS-DOCKET-DG-store-v0 engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  npm run ws-docket:dg-store-kit",
    "  Open /docket/altman/steward/#dual-gate-edits",
    "  Real license packs · mint real child QRs · production steward key custody"
  );
  return lines.join("\n");
}
