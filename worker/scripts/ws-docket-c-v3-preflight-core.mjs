/**
 * WS-DOCKET-C-v3 engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCKET_CV3_KIT_REL } from "./ws-docket-c-v3-kit-core.mjs";
import {
  assertStarterFourDiscoveryOptInOff,
  buildDocketDiscoveryOptInLiveObject,
  DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED,
  DOCKET_STARTER_CASE_IDS,
  validateDocketDiscoveryOptInFields,
} from "../../site/js/docket-discovery-opt-in-core.mjs";
import { DOCKET_CASE_IDS } from "../../site/js/docket-case-core.mjs";

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
export function assessWsDocketCv3Preflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  rows.push({
    id: "CV3-unlock",
    label: "DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED",
    met: DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED === true,
    detail: DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED ? "schema allows opt-in" : "locked",
  });

  const kit = fileExists(root, DOCKET_CV3_KIT_REL);
  rows.push({
    id: "CV3-kit",
    label: DOCKET_CV3_KIT_REL,
    met: kit,
    detail: kit ? "npm run ws-docket:c-v3-kit" : "missing — npm run ws-docket:c-v3-kit",
  });

  const core = fileExists(root, "site/js/docket-discovery-opt-in-core.mjs");
  rows.push({
    id: "CV3-core",
    label: "docket-discovery-opt-in-core.mjs",
    met: core,
    detail: core ? "validate / build / session preview" : "missing",
  });

  const steward = fileExists(root, "site/js/docket-steward-page.mjs");
  let mounts = false;
  if (steward) {
    const src = readFileSync(join(root, "site/js/docket-steward-page.mjs"), "utf8");
    mounts = src.includes("mountDocketDiscoveryOptInPanel");
  }
  rows.push({
    id: "CV3-steward",
    label: "steward mounts discovery panel",
    met: mounts,
    detail: mounts ? "mountDocketDiscoveryOptInPanel" : "missing mount",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "CV3-npm-kit",
    label: "package.json ws-docket:c-v3-kit",
    met: pkg.includes('"ws-docket:c-v3-kit"'),
    detail: pkg.includes('"ws-docket:c-v3-kit"') ? "wired" : "missing",
  });
  rows.push({
    id: "CV3-npm-preflight",
    label: "package.json ws-docket:c-v3-preflight",
    met: pkg.includes('"ws-docket:c-v3-preflight"'),
    detail: pkg.includes('"ws-docket:c-v3-preflight"') ? "wired" : "missing",
  });

  let fixtureOk = false;
  try {
    const live = buildDocketDiscoveryOptInLiveObject({
      caseId: "fixture-demo",
      profileId: "demoProfile01",
      qrId: "qr_demo_1",
      listedReason: "Chapter teach-in pin",
      approvals: ["hc-founders", "hc-reviewer"],
    });
    const errors = [];
    validateDocketDiscoveryOptInFields(live, null, errors, {
      requireStewardMembership: false,
    });
    fixtureOk = errors.length === 0 && live.discovery_opt_in === true;
  } catch {
    fixtureOk = false;
  }
  rows.push({
    id: "CV3-build",
    label: "buildDocketDiscoveryOptInLiveObject",
    met: fixtureOk,
    detail: fixtureOk ? "valid opt-in shape" : "build/validate failed",
  });

  let starterOff = false;
  try {
    const cases = DOCKET_CASE_IDS.map((id) =>
      JSON.parse(readFileSync(join(root, `site/data/docket-case-${id}.json`), "utf8"))
    );
    starterOff = assertStarterFourDiscoveryOptInOff(cases).ok;
  } catch {
    starterOff = false;
  }
  rows.push({
    id: "CV3-starter-off",
    label: "starter-four discovery_opt_in false",
    met: starterOff,
    detail: starterOff
      ? `${DOCKET_STARTER_CASE_IDS.length} cases gated`
      : "starter-four opt-in leak",
  });

  const caseCore = fileExists(root, "site/js/docket-case-core.mjs");
  let shellAnchor = false;
  if (caseCore) {
    const src = readFileSync(join(root, "site/js/docket-case-core.mjs"), "utf8");
    shellAnchor =
      src.includes('id="discovery-opt-in"') &&
      src.includes("docket-discovery-opt-in-root");
  }
  rows.push({
    id: "CV3-shell-anchor",
    label: "steward shell #discovery-opt-in",
    met: shellAnchor,
    detail: shellAnchor ? "present" : "missing",
  });

  const engineeringMet = rows.every((r) => r.met);
  return { rows, engineeringMet };
}

/**
 * @param {ReturnType<typeof assessWsDocketCv3Preflight>} report
 */
export function formatWsDocketCv3Preflight(report) {
  const lines = [
    "WS-DOCKET-C-v3 preflight — discovery opt-in",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push("");
  lines.push(
    report.engineeringMet
      ? "✅ WS-DOCKET-C-v3 engineering preflight PASS"
      : "✗ WS-DOCKET-C-v3 engineering preflight FAIL — fix ☐ rows above"
  );
  lines.push("");
  lines.push("Next:");
  lines.push("  npm run ws-docket:c-v3-kit");
  lines.push("  npm run worker:test -- worker/tests/docket-discovery-opt-in-core.test.ts");
  lines.push("  Open /docket/altman/steward/#discovery-opt-in");
  return lines.join("\n");
}
