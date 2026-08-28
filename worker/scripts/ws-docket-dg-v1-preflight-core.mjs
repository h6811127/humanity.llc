/**
 * WS-DOCKET-DG-v1 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCKET_DG_V1_KIT_REL } from "./ws-docket-dg-v1-kit-core.mjs";
import {
  applyDocketEditProposalSigned,
  approveDocketEditProposalSigned,
  createDocketEditProposalSigned,
  verifyDocketEditApproval,
} from "../../site/js/docket-edit-proposal-sign-core.mjs";

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
export async function assessWsDocketDgV1Preflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = fileExists(root, DOCKET_DG_V1_KIT_REL);
  rows.push({
    id: "DGV1-kit",
    label: DOCKET_DG_V1_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:dg-v1-kit" : "missing — npm run ws-docket:dg-v1-kit",
  });

  const core = fileExists(root, "site/js/docket-edit-proposal-sign-core.mjs");
  rows.push({
    id: "DGV1-core",
    label: "docket-edit-proposal-sign-core.mjs",
    met: core,
    detail: core ? "sign / verify / apply" : "missing",
  });

  const browser = fileExists(root, "site/js/docket-edit-proposal-sign-browser.mjs");
  rows.push({
    id: "DGV1-browser",
    label: "docket-edit-proposal-sign-browser.mjs",
    met: browser,
    detail: browser ? "Pages ESM (esm.sh)" : "missing",
  });

  const steward = fileExists(root, "site/js/docket-steward-page.mjs");
  let mountsSigned = false;
  if (steward) {
    const src = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
    mountsSigned = src.includes("approveDocketEditProposalSigned");
  }
  rows.push({
    id: "DGV1-steward",
    label: "steward uses signed approve/apply",
    met: mountsSigned,
    detail: mountsSigned ? "DG-v1 wired" : "missing signed flow",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "DGV1-npm-kit",
    label: "package.json ws-docket:dg-v1-kit",
    met: pkg.includes('"ws-docket:dg-v1-kit"'),
    detail: pkg.includes('"ws-docket:dg-v1-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "DGV1-npm-preflight",
    label: "package.json ws-docket:dg-v1-preflight",
    met: pkg.includes('"ws-docket:dg-v1-preflight"'),
    detail: pkg.includes('"ws-docket:dg-v1-preflight"') ? "wired" : "missing",
  });

  let altmanSig = false;
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "site/data/docket-case-altman.json"), "utf8")
    );
    const prop = Array.isArray(raw.edit_proposals) ? raw.edit_proposals[0] : null;
    const sigs = prop && Array.isArray(prop.signatures) ? prop.signatures : [];
    altmanSig =
      Boolean(prop) &&
      sigs.length >= 1 &&
      String(sigs[0]?.steward_id) === "hc-founders";
  } catch {
    altmanSig = false;
  }
  rows.push({
    id: "DGV1-altman-sig",
    label: "altman fixture has founders signature",
    met: altmanSig,
    detail: altmanSig ? "sample signatures[]" : "missing fixture signature",
  });

  let roundTrip = false;
  let detail = "failed";
  try {
    const stewards = [
      { id: "hc-founders", display_name: "A" },
      { id: "hc-reviewer", display_name: "B" },
    ];
    let prop = await createDocketEditProposalSigned(
      {
        id: "prop_preflight",
        field_path: "note",
        summary: "preflight",
        before: "",
        after: "hello",
        proposed_by: "hc-founders",
      },
      "altman",
      stewards
    );
    const firstSig = /** @type {Record<string, unknown>} */ (
      Array.isArray(prop.signatures) ? prop.signatures[0] : {}
    );
    const okFirst = await verifyDocketEditApproval(prop, "altman", firstSig);
    prop = await approveDocketEditProposalSigned(
      prop,
      "altman",
      "hc-reviewer",
      stewards
    );
    const applied = await applyDocketEditProposalSigned(prop, "altman");
    roundTrip =
      okFirst &&
      String(applied.proposal.status) === "applied" &&
      Array.isArray(applied.proposal.signatures) &&
      applied.proposal.signatures.length >= 2;
    detail = roundTrip ? "verified apply" : "incomplete round-trip";
  } catch (err) {
    roundTrip = false;
    detail = err instanceof Error ? err.message : String(err);
  }

  rows.push({
    id: "DGV1-roundtrip",
    label: "sign → second approve → apply verify",
    met: roundTrip,
    detail,
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {Awaited<ReturnType<typeof assessWsDocketDgV1Preflight>>} report
 */
export function formatWsDocketDgV1Preflight(report) {
  const lines = [
    "WS-DOCKET-DG-v1 preflight — signed dual-gate edit proposals",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push("");
  lines.push(
    report.engineeringMet
      ? "✅ WS-DOCKET-DG-v1 engineering preflight PASS"
      : "✗ WS-DOCKET-DG-v1 engineering preflight FAIL — fix ☐ rows above"
  );
  lines.push("");
  lines.push("Next:");
  lines.push("  npm run ws-docket:dg-v1-kit");
  lines.push("  npm run worker:test -- worker/tests/docket-edit-proposal-sign-core.test.ts");
  lines.push("  Open /docket/altman/steward/#dual-gate-edits");
  return lines.join("\n");
}
