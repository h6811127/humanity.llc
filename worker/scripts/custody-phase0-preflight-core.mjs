/**
 * WS-CUSTODY C0 engineering preflight (copy + setup surfaces).
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CUSTODY_RECOVERY_NOT_PLATFORM_SYNC,
  SETUP_PRINT_IN_APP_HINT,
  SETUP_SEATBELT_PANEL_LEAD,
  SETUP_TEST_SCAN_HINT,
  SETUP_TEST_SCAN_IN_APP_LABEL,
  SETUP_TEST_SCAN_PANEL_LEAD,
} from "../../site/js/device-ownership-copy-core.mjs";

export const CUSTODY_PHASE0_RUNBOOK_REL = "docs/CUSTODY_PHASE0_RUNBOOK.md";

/** @typedef {{ id: string, ok: boolean, detail: string }} CustodyPhase0Check */

/**
 * @param {string} root
 * @returns {CustodyPhase0Check[]}
 */
export function runCustodyPhase0PreflightChecks(root) {
  const checks = [];

  checks.push(checkRunbook(root));
  checks.push(checkCopyConstants());
  checks.push(checkCreatedSetupHtml(root));
  checks.push(checkSignOffMarkers(root));

  return checks;
}

/**
 * @param {string} root
 */
function checkSignOffMarkers(root) {
  const path = join(root, CUSTODY_PHASE0_RUNBOOK_REL);
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "sign-off-markers", ok: false, detail: "Runbook missing for sign-off markers" };
  }
  const ok =
    text.includes("G-C0 result") &&
    text.includes("custody:phase0-sign-off") &&
    text.includes("custody:phase0-kit");
  return {
    id: "sign-off-markers",
    ok,
    detail: ok ? "Kit + sign-off documented in runbook" : "Runbook missing kit/sign-off commands",
  };
}

/**
 * @param {string} root
 */
function checkRunbook(root) {
  const path = join(root, CUSTODY_PHASE0_RUNBOOK_REL);
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {
      id: "runbook",
      ok: false,
      detail: `Missing ${CUSTODY_PHASE0_RUNBOOK_REL}`,
    };
  }
  const required = [
    "Support drop taxonomy",
    "Comprehension scorecard",
    "Funnel template",
    "G-C0",
  ];
  const missing = required.filter((s) => !text.includes(s));
  return {
    id: "runbook",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? "Runbook sections present"
        : `Runbook missing: ${missing.join(", ")}`,
  };
}

function checkCopyConstants() {
  const strings = [
    SETUP_SEATBELT_PANEL_LEAD,
    CUSTODY_RECOVERY_NOT_PLATFORM_SYNC,
    SETUP_PRINT_IN_APP_HINT,
    SETUP_TEST_SCAN_PANEL_LEAD,
    SETUP_TEST_SCAN_IN_APP_LABEL,
    SETUP_TEST_SCAN_HINT,
  ];
  const empty = strings.filter((s) => !String(s || "").trim());
  const lead = SETUP_SEATBELT_PANEL_LEAD.toLowerCase();
  const hasRecovery = lead.includes("recovery") || lead.includes("backup");
  const deniesOperator = lead.includes("cannot") || lead.includes("can't");
  return {
    id: "copy",
    ok: empty.length === 0 && hasRecovery && deniesOperator,
    detail:
      empty.length > 0
        ? "Empty C0 copy constant"
        : !hasRecovery
          ? "Protect lead must mention recovery"
          : !deniesOperator
            ? "Protect lead must state operator cannot restore"
            : "C0 copy constants OK",
  };
}

/**
 * @param {string} root
 */
function checkCreatedSetupHtml(root) {
  const path = join(root, "site/created/index.html");
  let html = "";
  try {
    html = readFileSync(path, "utf8");
  } catch {
    return { id: "setup-html", ok: false, detail: "Missing site/created/index.html" };
  }
  const needs = [
    'data-setup-action="scan-in-app"',
    'data-setup-action="test-scan"',
    "created-setup-print-hint",
    "created-setup-test-hint",
    "created-setup-platform-sync-disclaimer",
  ];
  const missing = needs.filter((s) => !html.includes(s));
  return {
    id: "setup-html",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? "Setup wizard C0 surfaces present"
        : `Setup HTML missing: ${missing.join(", ")}`,
  };
}

/**
 * @param {CustodyPhase0Check[]} checks
 */
export function custodyPhase0PreflightPassed(checks) {
  return checks.every((c) => c.ok);
}
