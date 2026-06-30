/**
 * Agent D — public network player flow human gate sign-off helpers.
 * @see docs/CITY_GAME_INSTALL_QA.md § Public network player flow shell
 */

import { PLAYER_FLOW_FIELD_MIN_STRANGERS } from "../../site/js/public-network-player-flow-field-kit-core.mjs";

export const INSTALL_QA_REL = "docs/CITY_GAME_INSTALL_QA.md";

export const PLAYER_FLOW_INSTALL_QA_PENDING =
  "| Player flow shell (≥3 strangers, PD-1–PD-5) | ☐ Pending | |";

/**
 * @param {string[]} argv
 */
export function parsePlayerFlowSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let strangers = "";
  let passCount = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--strangers" && argv[i + 1]) {
      strangers = argv[++i];
    } else if (arg === "--pass-count" && argv[i + 1]) {
      passCount = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, strangers, passCount };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolvePlayerFlowSignOffResult(parsed) {
  if (parsed.pass && parsed.fail) {
    throw new Error("Use only one of --pass or --fail");
  }
  if (!parsed.pass && !parsed.fail) {
    throw new Error("Specify --pass or --fail");
  }
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {string} content
 */
export function playerFlowHumanSignedOff(content) {
  return (
    content.includes("Player flow shell **passed**") ||
    content.includes("| Player flow shell (≥3 strangers, PD-1–PD-5) | ☑ Pass")
  );
}

/**
 * @param {{
 *   dateIso: string;
 *   strangers?: string;
 *   passCount?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function playerFlowSignOffSummaryLines(input) {
  const minStrangers = PLAYER_FLOW_FIELD_MIN_STRANGERS;
  const lines = [
    "Agent D · public network player flow — sign-off record",
    "",
    `  Date:        ${input.dateIso}`,
    `  Strangers:   ${input.strangers || `[≥${minStrangers}]`}`,
    `  Pass count:  ${input.passCount || `[n/${minStrangers}]`}`,
    `  Result:      ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates install QA player-flow row.",
      "Engineering gate: npm run verify:public-network-player-flow",
      "Field walk kit: npm run player-flow:field-kit:check"
    );
  } else {
    lines.push(
      "On fail: fix shell copy / cross-links, re-run verify:public-network-player-flow, re-test with new strangers."
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; strangers?: string; passCount?: string }} opts
 */
export function applyInstallQaPlayerFlowPass(content, opts) {
  if (!content.includes(PLAYER_FLOW_INSTALL_QA_PENDING)) {
    if (content.includes("| Player flow shell (≥3 strangers, PD-1–PD-5) | ☑ Pass")) {
      return content;
    }
    throw new Error("install_qa_player_flow_marker_missing");
  }
  const note = `${opts.passCount || "≥3"}/${opts.strangers || "3"} strangers`;
  let out = content.replace(
    PLAYER_FLOW_INSTALL_QA_PENDING,
    `| Player flow shell (≥3 strangers, PD-1–PD-5) | ☑ Pass | ${opts.dateIso} |`
  );
  if (!out.includes("Player flow shell **passed**")) {
    out = out.replace(
      "**Human execution pending** — run PD-1–PD-5 with un coached strangers.",
      `**Player flow shell passed** (${opts.dateIso} · ${note})`
    );
  }
  return out;
}

/**
 * @param {{ fieldKitReady: boolean; humanSignedOff: boolean }} input
 */
export function formatPlayerFlowPreflightReport(input) {
  const lines = [
    "Agent D · public network player flow preflight",
    "",
    `  Engineering kit: ${input.fieldKitReady ? "☑" : "☐"} player-flow:field-kit:check`,
    `  Human PD-1–PD-5: ${input.humanSignedOff ? "☑" : "☐"} install QA sign-off row`,
    "",
    "Field walk (operators): /play/cedar-rapids/comprehension/player-flow-field-walk.html",
    "Sign-off: npm run player-flow:sign-off -- --pass --apply --strangers 3 --pass-count 3",
    "",
    "See docs/CITY_GAME_INSTALL_QA.md § Public network player flow shell",
  ];
  return lines.join("\n");
}
