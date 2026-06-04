/**
 * WS-CUSTODY C0 human gate sign-off helpers.
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md § Sign-off
 */

import {
  CUSTODY_PHASE0_EASY_MODE_PHASE0_IN_PROGRESS,
  CUSTODY_PHASE0_RUNBOOK_REL,
  CUSTODY_PHASE0_RUNBOOK_RESULT_PENDING,
  CUSTODY_PHASE0_RUNBOOK_STATUS_IN_PROGRESS,
} from "./custody-phase0-comprehension-kit-core.mjs";

export const CUSTODY_EASY_MODE_REL = "docs/CUSTODY_EASY_MODE.md";
export const PRODUCT_WORKSTREAM_REL = "docs/PRODUCT_WORKSTREAM_COORDINATION.md";

export const WS_CUSTODY_STATUS_C0_IN_PROGRESS =
  "| **Status** | **C0 in progress** — runbook + setup UX + `custody:phase0-preflight`; human comprehension (≥5) open |";

export const WS_CUSTODY_WORKSTREAM_C0_ROW =
  "| **Custody hybrid (easy + keys)** | [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) | **WS-CUSTODY C0 in progress** | Create setup UX, recovery copy, phase0 preflight |";

/**
 * @param {string[]} argv
 */
export function parseCustodyPhase0SignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let testers = "";
  let passCount = "";
  let drops = "";
  let decision = "proceed-c1";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) dateIso = argv[++i];
    else if (arg === "--testers" && argv[i + 1]) testers = argv[++i];
    else if (arg === "--pass-count" && argv[i + 1]) passCount = argv[++i];
    else if (arg === "--drops" && argv[i + 1]) drops = argv[++i];
    else if (arg === "--decision" && argv[i + 1]) decision = argv[++i];
  }

  return { pass, fail, apply, dateIso, testers, passCount, drops, decision };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveCustodyPhase0SignOffResult(parsed) {
  if (parsed.pass && parsed.fail) throw new Error("Use only one of --pass or --fail");
  if (!parsed.pass && !parsed.fail) throw new Error("Specify --pass or --fail");
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {{
 *   dateIso: string;
 *   testers?: string;
 *   passCount?: string;
 *   drops?: string;
 *   decision?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function custodyPhase0SignOffSummaryLines(input) {
  const lines = [
    "WS-CUSTODY C0 comprehension — sign-off record",
    "",
    `  Date:        ${input.dateIso}`,
    `  Testers:     ${input.testers || "[≥5]"}`,
    `  Pass count:  ${input.passCount || "[n/5]"}`,
    `  Top drops:   ${input.drops || "[optional — step:bucket,...]"}`,
    `  Decision:    ${input.decision || "proceed-c1"}`,
    `  Result:      ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates CUSTODY_PHASE0_RUNBOOK, CUSTODY_EASY_MODE, PRODUCT_WORKSTREAM_COORDINATION.",
      "Engineering gate: npm run custody:phase0-preflight",
      "Next phase: C1 device_unlock MVP (per decision)."
    );
  } else {
    lines.push("On fail: fix setup copy, re-run custody:phase0-preflight, re-test with 3+ new testers.");
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; testers?: string; passCount?: string; drops?: string; decision?: string }} opts
 */
export function applyCustodyPhase0RunbookPass(content, opts) {
  if (content.includes("C0 comprehension **passed**")) {
    throw new Error("custody_phase0_runbook_already_passed");
  }

  let out = content;
  if (out.includes(CUSTODY_PHASE0_RUNBOOK_RESULT_PENDING)) {
    out = out.replace(
      CUSTODY_PHASE0_RUNBOOK_RESULT_PENDING,
      `| G-C0 result | ☑ Pass (${opts.dateIso} · ${opts.passCount || "≥5"}/${opts.testers || "5"} testers${opts.drops ? ` · drops: ${opts.drops}` : ""}) |`
    );
  } else if (!out.includes("| G-C0 result | ☑ Pass")) {
    throw new Error("custody_phase0_runbook_result_marker_missing");
  }

  if (out.includes(CUSTODY_PHASE0_RUNBOOK_STATUS_IN_PROGRESS)) {
    out = out.replace(
      CUSTODY_PHASE0_RUNBOOK_STATUS_IN_PROGRESS,
      `**Status:** **C0 passed** (${opts.dateIso}) — G-C0 · decision: ${opts.decision || "proceed-c1"}`
    );
  }

  const deliverableRow = "| C0-5 | Nontechnical comprehension study (≥5 testers) | Human | § Scorecard · **G-C0** |";
  if (out.includes(deliverableRow)) {
    out = out.replace(
      deliverableRow,
      `| C0-5 | Nontechnical comprehension study (≥5 testers) | ☑ ${opts.dateIso} | § Scorecard · **G-C0** |`
    );
  }

  const deliverableFunnel = "| C0-6 | Funnel drop log — top 3 reasons documented | Human | § Funnel template · **G-C0** |";
  if (out.includes(deliverableFunnel)) {
    out = out.replace(
      deliverableFunnel,
      `| C0-6 | Funnel drop log — top 3 reasons documented | ☑ ${opts.dateIso} | ${opts.drops || "see sign-off record"} |`
    );
  }

  if (!out.includes(`| ${opts.dateIso} | C0 G-C0 passed`)) {
    out = out.replace(
      "| 2026-06-03 | C0 started — runbook + setup UX + preflight before C1 wrap crypto |",
      `| 2026-06-03 | C0 started — runbook + setup UX + preflight before C1 wrap crypto |\n| ${opts.dateIso} | C0 G-C0 passed — ${opts.passCount || "≥5"}/${opts.testers || "5"} testers · decision ${opts.decision || "proceed-c1"} |`
    );
  }

  return out;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; decision?: string }} opts
 */
export function applyCustodyEasyModePhase0Pass(content, opts) {
  if (!content.includes(CUSTODY_PHASE0_EASY_MODE_PHASE0_IN_PROGRESS)) {
    if (content.includes("Phase 0 — De-risk (no wrap crypto) — **passed**")) return content;
    throw new Error("custody_easy_mode_phase0_marker_missing");
  }
  return content.replace(
    CUSTODY_PHASE0_EASY_MODE_PHASE0_IN_PROGRESS,
    `Phase 0 — De-risk (no wrap crypto) — **passed** (${opts.dateIso})`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string; passCount?: string; testers?: string; decision?: string }} opts
 */
export function applyProductWorkstreamCustodyPhase0Pass(content, opts) {
  let out = content;

  if (out.includes(WS_CUSTODY_STATUS_C0_IN_PROGRESS)) {
    out = out.replace(
      WS_CUSTODY_STATUS_C0_IN_PROGRESS,
      `| **Status** | **C0 passed** (${opts.dateIso}) — G-C0 ${opts.passCount || "≥5"}/${opts.testers || "5"} · **C1 next** (${opts.decision || "proceed-c1"}) |`
    );
  }

  if (out.includes(WS_CUSTODY_WORKSTREAM_C0_ROW)) {
    out = out.replace(
      WS_CUSTODY_WORKSTREAM_C0_ROW,
      "| **Custody hybrid (easy + keys)** | [`CUSTODY_EASY_MODE.md`](CUSTODY_EASY_MODE.md) · [`CUSTODY_PHASE0_RUNBOOK.md`](CUSTODY_PHASE0_RUNBOOK.md) | **C0 ☑ " +
        opts.dateIso +
        "** · **C1 planning** | Kit, sign-off, setup UX shipped |"
    );
  }

  const changelogNeedle = "**Changelog (2026-06-03):** **WS-CUSTODY**";
  const changelogLine = `**Changelog (${opts.dateIso}):** **WS-CUSTODY C0 G-C0 passed** — ${opts.passCount || "≥5"}/${opts.testers || "5"} nontechnical testers · decision ${opts.decision || "proceed-c1"} · C1 device_unlock next.\n\n`;
  if (out.includes(changelogNeedle) && !out.includes("WS-CUSTODY C0 G-C0 passed")) {
    out = out.replace(changelogNeedle, changelogLine + changelogNeedle);
  }

  return out;
}

export { CUSTODY_PHASE0_RUNBOOK_REL } from "./custody-phase0-comprehension-kit-core.mjs";
