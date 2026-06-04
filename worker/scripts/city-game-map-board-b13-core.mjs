/**
 * B13 / P6 — live city board marketing gates.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § Risks and gates
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md P6
 */

import { launchChecklistGateSigned } from "./city-game-launch-checklist-core.mjs";

export const MAP_DASHBOARD_REL = "docs/CITY_GAME_MAP_DASHBOARD.md";
export const COMPREHENSION_RUNBOOK_REL = "docs/CITY_GAME_COMPREHENSION_RUNBOOK.md";

export const MAP_DASHBOARD_B13_PRIVACY_PENDING =
  "| B13 privacy review (snapshot JSON shape + no visit/player fields) | ☐ Pending | |";

export const LAUNCH_CHECKLIST_P6_PENDING =
  "| P6 | If marketing promises a **live city board**: **B13–B14** signed — [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md) (optional at S1 **M1** static; required before **M2** snapshot) | ☐ |";

/** Minimum GT-7 passes when launch surfaces market a live board. */
export const B13_GT7_REQUIRED_TESTERS = 5;

/**
 * @param {string} html
 */
export function htmlMarketsLiveCityBoard(html) {
  if (!html || typeof html !== "string") return false;
  const hasBoardSurface = /#city-state|city-game-map-board|city-game-map-snapshot/i.test(html);
  const hasLiveBoardCopy =
    /live chips/i.test(html) ||
    /city state board/i.test(html) ||
    /weekend city state board/i.test(html);
  return hasBoardSurface && hasLiveBoardCopy;
}

/**
 * @param {{ rulesHtml?: string | null; researchHtmlByRel?: Record<string, string> }} surfaces
 */
export function surfacesMarketLiveCityBoard(surfaces) {
  if (htmlMarketsLiveCityBoard(surfaces.rulesHtml ?? "")) return true;
  for (const html of Object.values(surfaces.researchHtmlByRel ?? {})) {
    if (!html) continue;
    if (/city state board/i.test(html) && /#city-state|\/play\/cedar-rapids\//i.test(html)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} markdown
 * @returns {boolean[]}
 */
export function parseComprehensionGt7Passes(markdown) {
  /** @type {boolean[]} */
  const passes = [];
  for (const line of String(markdown).split("\n")) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const gt7Cell = cells[10] ?? "";
    passes.push(/☑/.test(gt7Cell));
  }
  return passes;
}

/**
 * @param {string} markdown
 * @param {number} [minTesters]
 */
export function comprehensionGt7GateMet(markdown, minTesters = B13_GT7_REQUIRED_TESTERS) {
  const passes = parseComprehensionGt7Passes(markdown);
  const slice = passes.slice(0, minTesters);
  const passCount = slice.filter(Boolean).length;
  return {
    met: slice.length >= minTesters && slice.every(Boolean),
    passCount,
    testerRows: passes.length,
    required: minTesters,
  };
}

/**
 * @param {string} content
 */
export function mapDashboardB13PrivacySigned(content) {
  if (!content || typeof content !== "string") return false;
  if (content.includes(MAP_DASHBOARD_B13_PRIVACY_PENDING)) return false;
  return (
    /B13 privacy review[^|]*\|[^|]*☑/i.test(content) ||
    content.includes("B13 privacy review **signed**")
  );
}

/**
 * @param {string} content
 */
export function launchChecklistP6Signed(content) {
  return launchChecklistGateSigned(content, "P6") === true;
}

/**
 * @param {boolean} marketsLiveCityBoard
 * @returns {readonly string[]}
 */
export function launchChecklistRequiredGates(marketsLiveCityBoard) {
  const base = ["P1", "P2", "P4", "P5", "O1", "O2", "O3", "O4"];
  if (marketsLiveCityBoard) {
    return [...base, "P6"];
  }
  return base;
}

/**
 * @param {{
 *   marketsLiveCityBoard: boolean;
 *   b14Ok?: boolean;
 *   comprehensionRunbook?: string | null;
 *   mapDashboardDoc?: string | null;
 *   launchChecklistDoc?: string | null;
 * }} input
 */
export function assessMapBoardB13Ready(input) {
  const marketsLiveCityBoard = Boolean(input.marketsLiveCityBoard);
  if (!marketsLiveCityBoard) {
    return {
      required: false,
      marketsLiveCityBoard: false,
      ready: true,
      b14Ok: Boolean(input.b14Ok),
      gt7: { met: true, passCount: 0, testerRows: 0, required: 0 },
      privacySigned: true,
      p6Signed: launchChecklistP6Signed(input.launchChecklistDoc ?? ""),
      issues: [],
      warnings: [],
    };
  }

  const b14Ok = Boolean(input.b14Ok);
  const gt7 = comprehensionGt7GateMet(input.comprehensionRunbook ?? "");
  const privacySigned = mapDashboardB13PrivacySigned(input.mapDashboardDoc ?? "");
  const p6Signed = launchChecklistP6Signed(input.launchChecklistDoc ?? "");
  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const warnings = [];

  if (!b14Ok) {
    issues.push(
      "B14 — run npm run verify:city-game (snapshot + scan-analytics gate tests)"
    );
  }
  if (!gt7.met) {
    issues.push(
      `B13 GT-7 — ${gt7.passCount}/${gt7.required} testers with GT-7 ☑ in ${COMPREHENSION_RUNBOOK_REL} per-tester log`
    );
  }
  if (!privacySigned) {
    issues.push(
      `B13 privacy review — sign ${MAP_DASHBOARD_REL} or npm run city-game:map-board-b13-sign-off -- --pass --apply`
    );
  }
  if (!p6Signed && b14Ok && gt7.met && privacySigned) {
    warnings.push("P6 launch checklist row still ☐ — mark after B13 human gates");
  }

  const humanB13 = gt7.met && privacySigned;
  const ready = b14Ok && humanB13;

  return {
    required: true,
    marketsLiveCityBoard: true,
    ready,
    b14Ok,
    gt7,
    privacySigned,
    p6Signed,
    issues,
    warnings,
  };
}

/**
 * @param {import("./city-game-map-board-b13-core.mjs").assessMapBoardB13Ready} b13
 * @returns {string}
 */
export function formatMapBoardB13PreflightReport(b13) {
  const lines = ["Cedar Rapids · map board B13 preflight (live city board)", ""];
  if (!b13.required) {
    lines.push("Live board marketing: ☐ not detected on rules/research surfaces");
    lines.push("  P6 / B13 optional — static place list only is OK");
    return lines.join("\n");
  }
  lines.push("Live board marketing: ☑ detected (#city-state + live board copy)");
  lines.push(`  B14 engineering: ${b13.b14Ok ? "☑" : "☐"} verify:city-game snapshot + scan-analytics`);
  lines.push(
    `  GT-7 comprehension: ${b13.gt7.met ? "☑" : "☐"} ${b13.gt7.passCount}/${b13.gt7.required} testers`
  );
  lines.push(`  B13 privacy review: ${b13.privacySigned ? "☑" : "☐"} ${MAP_DASHBOARD_REL}`);
  lines.push(`  P6 launch checklist: ${b13.p6Signed ? "☑" : "☐"}`);
  lines.push(`  B13 ready: ${b13.ready ? "☑" : "☐"}`);
  if (b13.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of b13.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (b13.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const i of b13.issues) lines.push(`  ✗ ${i}`);
  }
  lines.push("");
  lines.push("After GT-7 + privacy pass:");
  lines.push("  npm run city-game:map-board-b13-sign-off -- --pass --apply");
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {{ dateIso: string; detail?: string }} opts
 */
export function applyMapDashboardB13PrivacyPass(content, opts) {
  if (!content.includes(MAP_DASHBOARD_B13_PRIVACY_PENDING)) {
    if (mapDashboardB13PrivacySigned(content)) return content;
    throw new Error("map_dashboard_b13_privacy_marker_missing");
  }
  const detail = opts.detail ? ` (${opts.detail})` : "";
  return content.replace(
    MAP_DASHBOARD_B13_PRIVACY_PENDING,
    `| B13 privacy review (snapshot JSON shape + no visit/player fields) | ☑ **${opts.dateIso}**${detail} |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistP6Pass(content, opts) {
  if (!content.includes(LAUNCH_CHECKLIST_P6_PENDING)) {
    if (launchChecklistP6Signed(content)) return content;
    throw new Error("launch_checklist_p6_marker_missing");
  }
  return content.replace(
    LAUNCH_CHECKLIST_P6_PENDING,
    `| P6 | If marketing promises a **live city board**: **B13–B14** signed — [\`CITY_GAME_MAP_DASHBOARD.md\`](CITY_GAME_MAP_DASHBOARD.md) | ☑ **${opts.dateIso}** · B13 + B14 |`
  );
}

/**
 * @param {{
 *   marketsLiveCityBoard: boolean;
 *   runbook: string;
 * }} input
 */
export function validateComprehensionSignOffPass(input) {
  if (!input.marketsLiveCityBoard) {
    return { ok: true, issues: [] };
  }
  const gt7 = comprehensionGt7GateMet(input.runbook);
  if (!gt7.met) {
    return {
      ok: false,
      issues: [
        `Live city board is marketed — GT-7 required for ${gt7.required} testers (${gt7.passCount}/${gt7.required} ☑ in per-tester log).`,
        `Open ${COMPREHENSION_RUNBOOK_REL} § Per-tester log, then re-run sign-off.`,
      ],
    };
  }
  return { ok: true, issues: [] };
}
