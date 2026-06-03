/**
 * C5 launch checklist — gate assessment + sign-off helpers.
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md
 */

export const LAUNCH_CHECKLIST_REL = "docs/CITY_GAME_LAUNCH_CHECKLIST.md";

export const LAUNCH_CHECKLIST_C5_PENDING =
  "| P1–P5 and O1–O4 signed above | ☐ Pending |";

export const LAUNCH_CHECKLIST_P4_PENDING =
  "| P4 | Research pages — live season banners + rules link | ☐ |";

export const LAUNCH_CHECKLIST_P5_PENDING =
  "| P5 | Confirm scan analytics still off — [`REFERENCE_OPERATOR_DATA_POLICY.md`](REFERENCE_OPERATOR_DATA_POLICY.md) | ☐ · automated: `city-game-scan-analytics-gate.test.ts` in `verify:city-game` |";

export const LAUNCH_CHECKLIST_O1_PENDING =
  "| O1 | Game-operator private key in custody — [`CITY_GAME_OPERATOR_CUSTODY.md`](CITY_GAME_OPERATOR_CUSTODY.md) | ☐ |";

export const LAUNCH_CHECKLIST_O2_PENDING =
  "| O2 | [`CITY_GAME_NODE_INSTALL_MAP.md`](CITY_GAME_NODE_INSTALL_MAP.md) — install status + node_14 steward contact | ☐ |";

export const LAUNCH_CHECKLIST_O3_PENDING =
  "| O3 | Weekend operator schedule assigned — [`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md) | ☐ |";

export const LAUNCH_CHECKLIST_O4_PENDING =
  "| O4 | Support team has [`CITY_GAME_SUPPORT_MACROS.md`](CITY_GAME_SUPPORT_MACROS.md) | ☐ |";

/** @type {readonly string[]} */
export const LAUNCH_CHECKLIST_REQUIRED_GATES = ["P1", "P2", "P4", "P5", "O1", "O2", "O3", "O4"];

/**
 * @param {string} line
 */
export function launchChecklistRowIsSigned(line) {
  const parts = line.split("|");
  if (parts.length < 3) return false;
  const doneCell = parts[parts.length - 2]?.trim() ?? "";
  return doneCell.startsWith("☑") || /^☑/.test(doneCell);
}

/**
 * @param {string} content
 * @param {string} rowKey
 */
export function findLaunchChecklistRow(content, rowKey) {
  const re = new RegExp(`^\\|\\s*${rowKey}\\s*\\|`, "m");
  return content.split("\n").find((line) => re.test(line)) ?? null;
}

/**
 * @param {string} content
 * @param {string} rowKey
 */
export function launchChecklistGateSigned(content, rowKey) {
  const line = findLaunchChecklistRow(content, rowKey);
  if (!line) return null;
  return launchChecklistRowIsSigned(line);
}

/**
 * @param {string} content
 */
export function launchChecklistC5Signed(content) {
  if (!content.includes(LAUNCH_CHECKLIST_C5_PENDING)) {
    return (
      content.includes("P1–P5 and O1–O4 signed above | ☑") ||
      content.includes("Launch checklist **signed**")
    );
  }
  return false;
}

/**
 * @param {string[]} argv
 */
export function parseLaunchChecklistSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let commander = "";
  /** @type {string[]} */
  const mark = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--commander" && argv[i + 1]) {
      commander = argv[++i];
    } else if (arg === "--mark") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        mark.push(argv[++i].toUpperCase());
      }
    }
  }

  return { pass, fail, apply, dateIso, commander, mark };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveLaunchChecklistSignOffResult(parsed) {
  if (parsed.pass && parsed.fail) {
    throw new Error("Use only one of --pass or --fail");
  }
  if (!parsed.pass && !parsed.fail && !parsed.mark.length) {
    throw new Error("Specify --pass, --fail, or --mark P4 O1 …");
  }
  if (parsed.pass) return "pass";
  if (parsed.fail) return "fail";
  return "mark";
}

/**
 * @param {{
 *   launchChecklistDoc?: string | null;
 *   scanAnalyticsGateOk?: boolean;
 * }} input
 */
export function assessLaunchChecklistReady(input) {
  const content = input.launchChecklistDoc ?? "";
  /** @type {Record<string, boolean | null>} */
  const gates = {};
  /** @type {string[]} */
  const pending = [];

  for (const key of LAUNCH_CHECKLIST_REQUIRED_GATES) {
    const signed = launchChecklistGateSigned(content, key);
    gates[key] = signed;
    if (signed !== true) {
      pending.push(key);
    }
  }

  const p3Signed = launchChecklistGateSigned(content, "P3");
  const c5Signed = launchChecklistC5Signed(content);
  const allRequiredSigned = pending.length === 0;

  /** @type {string[]} */
  const blockers = [];
  if (!allRequiredSigned) {
    blockers.push(`Launch checklist gates pending: ${pending.join(", ")}`);
  }
  if (!c5Signed && allRequiredSigned) {
    blockers.push("C5 launch sign-off row pending — npm run city-game:launch-checklist-sign-off -- --pass --apply");
  }

  return {
    gates,
    p3Signed,
    p5EngineeringOk: Boolean(input.scanAnalyticsGateOk),
    allRequiredSigned,
    c5Signed,
    readyForLaunchDay: allRequiredSigned && c5Signed,
    pending,
    blockers,
  };
}

/**
 * @param {{
 *   allRequiredSigned: boolean;
 *   c5Signed: boolean;
 *   pending: string[];
 *   p3Signed: boolean | null;
 *   p5EngineeringOk?: boolean;
 *   gates: Record<string, boolean | null>;
 * }} c5
 * @returns {string}
 */
export function formatLaunchChecklistPreflightReport(c5) {
  const lines = ["Cedar Rapids · launch checklist preflight (C5)", ""];
  lines.push(
    `C5 launch day ready: ${c5.readyForLaunchDay ? "☑" : "☐"} P1–P5 + O1–O4 signed + C5 row`
  );
  lines.push(`  Rules page P3: ${c5.p3Signed ? "☑" : "☐"}`);
  for (const key of LAUNCH_CHECKLIST_REQUIRED_GATES) {
    const signed = c5.gates[key];
    const suffix =
      key === "P5" && c5.p5EngineeringOk && signed !== true
        ? " (verify:city-game scan-analytics test ☑ — mark with --mark P5)"
        : "";
    lines.push(`  ${key}: ${signed ? "☑" : "☐"}${suffix}`);
  }
  lines.push(`  C5 sign-off row: ${c5.c5Signed ? "☑" : "☐"}`);
  if (c5.pending.length) {
    lines.push("");
    lines.push("Pending gates:");
    for (const key of c5.pending) lines.push(`  • ${key}`);
  }
  lines.push("");
  lines.push("Mark individual ops gates after human confirmation:");
  lines.push("  npm run city-game:launch-checklist-sign-off -- --mark O1 O2 O3 O4 --apply");
  lines.push("After P1 (comprehension) + P2 (install QA) sign-offs:");
  lines.push("  npm run city-game:launch-checklist-sign-off -- --pass --apply --commander \"Name\"");
  lines.push("");
  lines.push("Launch day (blocked until C5 ready):");
  lines.push("  npm run city-game:launch-day -- --confirm-production");
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {string} rowKey
 * @param {{ dateIso: string; detail?: string }} opts
 */
export function applyLaunchChecklistRowPass(content, rowKey, opts) {
  const line = findLaunchChecklistRow(content, rowKey);
  if (!line) {
    throw new Error(`launch_checklist_${rowKey.toLowerCase()}_missing`);
  }
  if (launchChecklistRowIsSigned(line)) {
    return content;
  }
  const detail = opts.detail ? ` · ${opts.detail}` : "";
  const updated = line.replace(/\|\s*☐[^|]*\|$/, `| ☑ **${opts.dateIso}**${detail} |`);
  if (updated === line) {
    throw new Error(`launch_checklist_${rowKey.toLowerCase()}_marker_missing`);
  }
  return content.replace(line, updated);
}

/**
 * @param {string} content
 * @param {{ dateIso: string; commander?: string }} opts
 */
export function applyLaunchChecklistC5Pass(content, opts) {
  if (launchChecklistC5Signed(content)) {
    if (!content.includes("Launch checklist **signed**")) {
      return applyLaunchChecklistStatusSigned(content, opts);
    }
    return content;
  }
  if (!content.includes(LAUNCH_CHECKLIST_C5_PENDING)) {
    throw new Error("launch_checklist_c5_marker_missing");
  }
  const commander = opts.commander ? ` · ${opts.commander}` : "";
  let out = content.replace(
    LAUNCH_CHECKLIST_C5_PENDING,
    `| P1–P5 and O1–O4 signed above | ☑ **${opts.dateIso}**${commander} |`
  );
  out = applyLaunchChecklistStatusSigned(out, opts);
  return out;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; commander?: string }} opts
 */
export function applyLaunchChecklistStatusSigned(content, opts) {
  if (content.includes("Launch checklist **signed**")) {
    return content;
  }
  const suffix = opts.commander ? ` (${opts.commander})` : "";
  return content.replace(
    "**Status:** Internal · run immediately before public season open",
    `**Status:** Launch checklist **signed** ${opts.dateIso}${suffix} · ready for launch day`
  );
}

/**
 * @param {{
 *   dateIso: string;
 *   commander?: string;
 *   result: "pass" | "fail" | "mark";
 *   mark?: string[];
 * }} input
 * @returns {string[]}
 */
export function launchChecklistSignOffSummaryLines(input) {
  const lines = [
    "C5 launch checklist — sign-off record",
    "",
    `  Date:       ${input.dateIso}`,
    `  Commander:  ${input.commander || "[launch lead]"}`,
    `  Action:     ${input.result.toUpperCase()}${input.mark?.length ? ` (${input.mark.join(", ")})` : ""}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: marks C5 row + status header when P1–P5 and O1–O4 are ☑.",
      "Next: npm run city-game:launch-day -- --confirm-production"
    );
  } else if (input.result === "mark") {
    lines.push("On --mark --apply: updates individual checklist rows (ops confirmation).");
  } else {
    lines.push("On fail: resolve blockers and re-run npm run city-game:launch-checklist-preflight");
  }
  lines.push("");
  return lines;
}
