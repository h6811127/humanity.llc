/**
 * OG-2 dual-gate human walk sign-off helpers.
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */

export const DUAL_GATE_WALK_SIGNOFF_PENDING =
  "| OG-2 dual-gate D1–D3 prod walk | ☐ | `npm run ws-object-graph:prod-walk-preflight` then manual D1–D3 |";

export const DUAL_GATE_WALK_SIGNOFF_PASS =
  "| OG-2 dual-gate D1–D3 prod walk | ☑ | Witness + quorum live on cabinet · graph open |";

/**
 * @param {string[]} argv
 */
export function parseDualGateWalkSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let operator = "";
  let note = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--operator" && argv[i + 1]) {
      operator = argv[++i];
    } else if (arg === "--note" && argv[i + 1]) {
      note = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, operator, note };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveDualGateWalkSignOffResult(parsed) {
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
 *   operator?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function dualGateWalkSignOffSummaryLines(input) {
  return [
    "OG-2 dual-gate prod walk — sign-off record",
    "",
    `  Date:      ${input.dateIso}`,
    `  Operator:  ${input.operator || "[name]"}`,
    `  Result:    ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
    "Preflight: npm run ws-object-graph:prod-walk-preflight",
    "Walk:      /play/cedar-rapids/comprehension/dual-gate-walk.html",
    "",
  ];
}

/**
 * @param {{
 *   dateIso: string;
 *   operator?: string;
 *   note?: string;
 * }} input
 */
export function applyDualGateWalkSignOffPass(launchDoc, input) {
  let next = launchDoc;
  const detail = [
    "Witness + quorum live on cabinet · graph open",
    input.dateIso,
    input.operator,
    input.note,
  ]
    .filter(Boolean)
    .join(" · ");
  if (next.includes(DUAL_GATE_WALK_SIGNOFF_PENDING)) {
    next = next.replace(
      DUAL_GATE_WALK_SIGNOFF_PENDING,
      DUAL_GATE_WALK_SIGNOFF_PASS.replace("Witness + quorum live on cabinet · graph open", detail)
    );
  }
  const liveScanLine =
    /^- \[ \] Live scan smoke:.*$/m;
  if (liveScanLine.test(next)) {
    const liveDetail = [
      "D1 browser contribute · D2 operator --quorum · D3 graph Live",
      input.dateIso,
      input.operator,
    ]
      .filter(Boolean)
      .join(" · ");
    next = next.replace(liveScanLine, `- [x] Live scan smoke: ${liveDetail}`);
  }
  const marker = "## OG-2 human walk sign-off";
  const noteLine = input.note ? `\n\nNote: ${input.note}` : "";
  const block = [
    marker,
    "",
    `**Result:** ☑ Pass · ${input.dateIso}${input.operator ? ` · ${input.operator}` : ""}`,
    "",
    "Steps D0–D3 completed on production cabinet (witness + quorum → graph open).",
    noteLine,
    "",
  ].join("\n");
  if (next.includes(marker)) {
    next = next.replace(
      /## OG-2 human walk sign-off[\s\S]*?(?=\n## |\n---|\Z)/,
      `${block.trim()}\n\n`
    );
  } else {
    next = `${next.trim()}\n\n${block}`;
  }
  return next;
}
