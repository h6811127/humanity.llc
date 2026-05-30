/**
 * P0b-1 prod WebKit sign-off helpers (R10).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1
 */

export const SAFARI_KEYS_DOC_REL = "docs/SAFARI_KEYS_WIPE_INVESTIGATION.md";

/** Marker in P0b-1 rollout table before prod WebKit sign-off. */
export const P0B1_PROD_WEBKIT_SIGNOFF_PENDING =
  "prod WebKit sign-off on humanity.llc still required";

/**
 * @param {string[]} argv
 */
export function parseCardDisabledSinceVisitSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let device = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--device" && argv[i + 1]) {
      device = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, device };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveCardDisabledSinceVisitSignOffResult(parsed) {
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
 *   device?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function cardDisabledSinceVisitSignOffSummaryLines(input) {
  const lines = [
    "P0b-1 card disabled since visit — prod WebKit sign-off",
    "",
    `  Date:   ${input.dateIso}`,
    `  Device: ${input.device || "[e.g. iPhone Safari on humanity.llc]"}`,
    `  Result: ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1 status.",
      "Desk gate (engineering): npm run card-disabled-since-visit:desk-gate"
    );
  } else {
    lines.push(
      "On fail: file regression with hc_debug snapshot; do not mark P0b-1 passed.",
      "See docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md"
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; device?: string }} opts
 */
export function applySafariKeysDocP0b1ProdPass(content, opts) {
  if (!content.includes(P0B1_PROD_WEBKIT_SIGNOFF_PENDING)) {
    if (content.includes("prod WebKit sign-off **passed**")) {
      throw new Error("safari_keys_p0b1_already_passed");
    }
    throw new Error("safari_keys_p0b1_pending_marker_missing");
  }
  const deviceSuffix = opts.device ? ` · ${opts.device}` : "";
  return content.replace(
    P0B1_PROD_WEBKIT_SIGNOFF_PENDING,
    `prod WebKit sign-off **passed** (${opts.dateIso}${deviceSuffix})`
  );
}
