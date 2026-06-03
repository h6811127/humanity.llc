/**
 * C2 GT comprehension human gate sign-off helpers.
 * @see docs/CITY_GAME_COMPREHENSION_RUNBOOK.md § Sign-off
 */

import {
  COMPREHENSION_INSTALL_QA_PENDING,
  COMPREHENSION_LAUNCH_CHECKLIST_P1_PENDING,
  COMPREHENSION_RUNBOOK_REL,
  COMPREHENSION_RUNBOOK_RESULT_PENDING,
} from "./city-game-comprehension-kit-core.mjs";

export const LAUNCH_CHECKLIST_REL = "docs/CITY_GAME_LAUNCH_CHECKLIST.md";
export const INSTALL_QA_REL = "docs/CITY_GAME_INSTALL_QA.md";

/**
 * @param {string[]} argv
 */
export function parseComprehensionSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let testers = "";
  let passCount = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--testers" && argv[i + 1]) {
      testers = argv[++i];
    } else if (arg === "--pass-count" && argv[i + 1]) {
      passCount = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, testers, passCount };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveComprehensionSignOffResult(parsed) {
  if (parsed.pass && parsed.fail) {
    throw new Error("Use only one of --pass or --fail");
  }
  if (!parsed.pass && !parsed.fail) {
    throw new Error("Specify --pass or --fail");
  }
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {{
 *   dateIso: string;
 *   testers?: string;
 *   passCount?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function comprehensionSignOffSummaryLines(input) {
  const lines = [
    "C2 GT comprehension — sign-off record",
    "",
    `  Date:        ${input.dateIso}`,
    `  Testers:     ${input.testers || "[≥5]"}`,
    `  Pass count:  ${input.passCount || "[n/5]"}`,
    `  Result:      ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates comprehension runbook, install QA, launch checklist P1.",
      "Engineering gate: npm run city-game:comprehension-preflight"
    );
  } else {
    lines.push(
      "On fail: fix scan/rules copy, re-run npm run verify:city-game, re-test with 3+ new strangers."
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; testers?: string; passCount?: string }} opts
 */
export function applyComprehensionRunbookPass(content, opts) {
  if (content.includes("GT comprehension **passed**")) {
    throw new Error("comprehension_runbook_already_passed");
  }

  let out = content;
  if (out.includes(COMPREHENSION_RUNBOOK_RESULT_PENDING)) {
    out = out.replace(
      COMPREHENSION_RUNBOOK_RESULT_PENDING,
      `| Result | ☑ Pass (${opts.dateIso} · ${opts.passCount || "≥5"}/${opts.testers || "5"} testers) |`
    );
  } else if (!out.includes("| Result | ☑ Pass")) {
    throw new Error("comprehension_runbook_result_marker_missing");
  }

  if (!out.includes("GT comprehension **passed**")) {
    out = out.replace(
      "**Status:** Runbook ready; **human execution pending**",
      `**Status:** GT comprehension **passed** (${opts.dateIso})`
    );
  }

  return out;
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyInstallQaComprehensionPass(content, opts) {
  if (!content.includes(COMPREHENSION_INSTALL_QA_PENDING)) {
    if (content.includes("GT comprehension (≥5 testers) | ☑")) {
      return content;
    }
    throw new Error("install_qa_comprehension_marker_missing");
  }
  return content.replace(
    COMPREHENSION_INSTALL_QA_PENDING,
    `| GT comprehension (≥5 testers) | ☑ Pass | ${opts.dateIso} |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistP1Pass(content, opts) {
  if (!content.includes(COMPREHENSION_LAUNCH_CHECKLIST_P1_PENDING)) {
    if (content.includes("P1 | [`CITY_GAME_COMPREHENSION_RUNBOOK.md`]") && content.includes("☑")) {
      return content;
    }
    throw new Error("launch_checklist_p1_marker_missing");
  }
  return content.replace(
    COMPREHENSION_LAUNCH_CHECKLIST_P1_PENDING,
    `| P1 | [\`CITY_GAME_COMPREHENSION_RUNBOOK.md\`](CITY_GAME_COMPREHENSION_RUNBOOK.md) — ≥5 testers pass GT-1–GT-7 (GT-7 when marketing live board) | ☑ **${opts.dateIso}** |`
  );
}

export { COMPREHENSION_RUNBOOK_REL } from "./city-game-comprehension-kit-core.mjs";
