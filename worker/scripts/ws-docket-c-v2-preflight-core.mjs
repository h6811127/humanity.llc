/**
 * WS-DOCKET-C-v2 engineering preflight — mint plumbing + unbound production gate.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCKET_CASE_IDS } from "../../site/js/docket-case-core.mjs";
import {
  assertPublicDocketCasesBound,
  docketCasefileFixtureLiveObject,
  DOCKET_CV2_KIT_REL,
  validateDocketLiveObjectBind,
} from "../../site/js/docket-live-object-bind-core.mjs";

/** @typedef {{ id: string; label: string; met: boolean; detail: string }} DocketCv2GateRow */

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
export function assessDocketCv2Kit(root) {
  const kitExists = fileExists(root, DOCKET_CV2_KIT_REL);
  return {
    rows: [
      {
        id: "C2-kit-page",
        label: DOCKET_CV2_KIT_REL,
        met: kitExists,
        detail: kitExists
          ? "npm run ws-docket:c-v2-kit"
          : "missing — npm run ws-docket:c-v2-kit",
      },
    ],
    engineeringMet: kitExists,
  };
}

/**
 * @param {string} root
 */
export function assessDocketCv2BindCore(root) {
  const core = fileExists(root, "site/js/docket-live-object-bind-core.mjs");
  const fixture = docketCasefileFixtureLiveObject();
  const bindOk = validateDocketLiveObjectBind(fixture).ok;
  /** @type {DocketCv2GateRow[]} */
  const rows = [
    {
      id: "C2-bind-core",
      label: "docket-live-object-bind-core.mjs",
      met: core,
      detail: core ? "present" : "missing",
    },
    {
      id: "C2-fixture-bound",
      label: "fixture live_object validates as bound",
      met: bindOk,
      detail: bindOk
        ? `${fixture.object_id} · ${fixture.scan_path}`
        : "fixture bind invalid",
    },
  ];
  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {string} root
 */
export function assessDocketCv2ProductionBound(root) {
  /** @type {DocketCv2GateRow[]} */
  const rows = [];
  const cases = [];
  for (const id of DOCKET_CASE_IDS) {
    const rel = `site/data/docket-case-${id}.json`;
    const path = join(root, rel);
    const exists = existsSync(path);
    if (!exists) {
      rows.push({
        id: `C2-bound-${id}`,
        label: rel,
        met: false,
        detail: "missing case JSON",
      });
      continue;
    }
    const raw = JSON.parse(readFileSync(path, "utf8"));
    cases.push(raw);
  }
  const gate = assertPublicDocketCasesBound(cases);
  rows.push({
    id: "C2-public-bound",
    label: "Public roster live_object is bound",
    met: gate.ok,
    detail: gate.ok
      ? `${DOCKET_CASE_IDS.join(", ")} bound · discovery_opt_in false`
      : (gate.errors ?? []).join("; "),
  });
  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {string} root
 */
export function assessDocketCv2Npm(root) {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  /** @type {DocketCv2GateRow[]} */
  const rows = [
    {
      id: "C2-npm-kit",
      label: "package.json ws-docket:c-v2-kit",
      met: pkg.includes('"ws-docket:c-v2-kit"'),
      detail: pkg.includes('"ws-docket:c-v2-kit"') ? "wired" : "missing",
    },
    {
      id: "C2-npm-preflight",
      label: "package.json ws-docket:c-v2-preflight",
      met: pkg.includes('"ws-docket:c-v2-preflight"'),
      detail: pkg.includes('"ws-docket:c-v2-preflight"') ? "wired" : "missing",
    },
  ];
  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {string} root
 */
export function assessDocketCv2Preflight(root) {
  const kit = assessDocketCv2Kit(root);
  const bind = assessDocketCv2BindCore(root);
  const unbound = assessDocketCv2ProductionBound(root);
  const npm = assessDocketCv2Npm(root);
  return {
    kit,
    bind,
    unbound,
    npm,
    rows: [...kit.rows, ...bind.rows, ...unbound.rows, ...npm.rows],
  };
}

/**
 * @param {ReturnType<typeof assessDocketCv2Preflight>} report
 */
export function docketCv2EngineeringReady(report) {
  return (
    report.kit.engineeringMet &&
    report.bind.engineeringMet &&
    report.unbound.engineeringMet &&
    report.npm.engineeringMet
  );
}

/**
 * @param {ReturnType<typeof assessDocketCv2Preflight>} report
 */
export function formatDocketCv2PreflightReport(report) {
  const lines = ["WS-DOCKET-C-v2 preflight", ""];
  for (const row of report.rows) {
    lines.push(`${row.met ? "✓" : "✗"} ${row.id} — ${row.label}`);
    lines.push(`    ${row.detail}`);
  }
  lines.push("");
  lines.push(
    docketCv2EngineeringReady(report)
      ? "Engineering: READY (starter-four casefiles bound · QR upgrade path open · discovery opt-in false · C-v3 next)"
      : "Engineering: NOT READY"
  );
  return lines.join("\n");
}
