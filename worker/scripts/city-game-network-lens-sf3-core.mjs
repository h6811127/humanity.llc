/**
 * SF-3 / GT-8 — network lens engineering + human orientation gates.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § Network lens · GT-8
 */

import { validateNetworkLens } from "../../site/js/city-game-network-lens-core.mjs";

import {
  COMPREHENSION_RUNBOOK_REL,
  comprehensionGt8GateMet,
  MAP_DASHBOARD_REL,
  MAP_DASHBOARD_SF3_GT8_PENDING,
  MAP_DASHBOARD_SF3_IMPLEMENTATION_PENDING,
} from "./city-game-map-board-b13-core.mjs";

/**
 * @param {string} content
 */
export function mapDashboardSf3ImplementationSigned(content) {
  if (!content || typeof content !== "string") return false;
  if (content.includes(MAP_DASHBOARD_SF3_IMPLEMENTATION_PENDING)) return false;
  return (
    /SF-3 network lens[^|]*implementation[^|]*\|[^|]*☑/i.test(content) ||
    content.includes("SF-3 network lens — implementation **signed**")
  );
}

/**
 * @param {string} content
 */
export function mapDashboardSf3Gt8Signed(content) {
  if (!content || typeof content !== "string") return false;
  if (content.includes(MAP_DASHBOARD_SF3_GT8_PENDING)) return false;
  return /SF-3 GT-8[^|]*\|[^|]*☑/i.test(content);
}

/**
 * @param {string} boardHtml — rendered map board inner HTML (not static page shell)
 */
export function networkLensBoardEngineeringOk(boardHtml) {
  /** @type {string[]} */
  const issues = [];
  if (!/city-game-map-board--network-lens/i.test(boardHtml)) {
    issues.push("board missing city-game-map-board--network-lens");
  }
  if (!/city-game-map-pin--next/i.test(boardHtml)) {
    issues.push("board missing Next pin affordance (GT-8 orientation)");
  }
  if (!/data-list-lens/i.test(boardHtml)) {
    issues.push("board missing play spine / all places list lens");
  }
  if (!/city-game-map-start-callout/i.test(boardHtml)) {
    issues.push("board missing express line start callout");
  }
  const sf2b = networkLensSf2bEngineeringOk(boardHtml);
  for (const msg of sf2b.issues) issues.push(msg);
  return { ok: issues.length === 0, issues };
}

/**
 * SF-2b — snapshot chips on sketch pins + selection panel (not list-only).
 * @param {string} boardHtml
 */
export function networkLensSf2bEngineeringOk(boardHtml) {
  /** @type {string[]} */
  const issues = [];
  if (!/city-game-map-pin-state/i.test(boardHtml)) {
    issues.push("SF-2b — board missing city-game-map-pin-state sublabel on sketch pins");
  }
  if (!/data-selection-chips/i.test(boardHtml)) {
    issues.push("SF-2b — board missing selection panel chip mount [data-selection-chips]");
  }
  if (!/data-selection-effect/i.test(boardHtml)) {
    issues.push("SF-2b — board missing selection panel state hero [data-selection-effect]");
  }
  if (!/data-node-chips/i.test(boardHtml)) {
    issues.push("SF-2b — board missing list row chip mount [data-node-chips]");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} rulesHtml
 */
export function networkLensRulesPageVisualOk(rulesHtml) {
  /** @type {string[]} */
  const issues = [];
  if (!/hc-emphasis-card/i.test(rulesHtml)) {
    issues.push("rules page missing hc-emphasis-card emphasis plates (Phase D)");
  }
  if (!/city-game-rules-guide-grid/i.test(rulesHtml)) {
    issues.push("rules page missing city-game-rules-guide-grid mount");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   boardHtml: string;
 *   rulesHtml: string;
 *   b14Ok?: boolean;
 *   comprehensionRunbook?: string | null;
 *   mapDashboardDoc?: string | null;
 * }} input
 */
export function assessNetworkLensSf3Ready(input) {
  const lensIssues = validateNetworkLens(input.season);
  const board = networkLensBoardEngineeringOk(input.boardHtml ?? "");
  const rulesPage = networkLensRulesPageVisualOk(input.rulesHtml ?? "");
  const gt8 = comprehensionGt8GateMet(input.comprehensionRunbook ?? "");
  const implementationSigned = mapDashboardSf3ImplementationSigned(input.mapDashboardDoc ?? "");
  const gt8Signed = mapDashboardSf3Gt8Signed(input.mapDashboardDoc ?? "");

  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const warnings = [];

  if (!input.b14Ok) {
    issues.push("B14 — run npm run verify:city-game");
  }
  if (lensIssues.length) {
    for (const msg of lensIssues) issues.push(`network_lens — ${msg}`);
  }
  for (const msg of board.issues) issues.push(`board — ${msg}`);
  for (const msg of rulesPage.issues) issues.push(`rules page — ${msg}`);

  const engineeringReady =
    Boolean(input.b14Ok) &&
    lensIssues.length === 0 &&
    board.ok &&
    rulesPage.ok;

  if (engineeringReady && !implementationSigned) {
    warnings.push(
      `Mark SF-3 engineering complete in ${MAP_DASHBOARD_REL} launch sign-off table`
    );
  }
  if (engineeringReady && !gt8.met) {
    warnings.push(
      `GT-8 human — ${gt8.passCount}/${gt8.required} of ${gt8.cohort} testers ☑ in ${COMPREHENSION_RUNBOOK_REL} per-tester log`
    );
  }

  const humanReady = gt8.met || gt8Signed;
  const ready = engineeringReady && humanReady;

  return {
    engineeringReady,
    humanReady,
    ready,
    gt8,
    implementationSigned,
    gt8Signed,
    issues,
    warnings,
  };
}

/**
 * @param {ReturnType<typeof assessNetworkLensSf3Ready>} report
 * @returns {string}
 */
export function formatNetworkLensSf3PreflightReport(report) {
  const lines = ["Cedar Rapids · network lens SF-3 preflight (GT-8)", ""];
  lines.push(`  Engineering: ${report.engineeringReady ? "☑" : "☐"} season JSON + map/rules surfaces`);
  lines.push(
    `  GT-8 human: ${report.humanReady ? "☑" : "☐"} ${report.gt8.passCount}/${report.gt8.required} of ${report.gt8.cohort} testers (orientation &lt;10s)`
  );
  lines.push(`  SF-3 ready: ${report.ready ? "☑" : "☐"}`);
  if (report.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of report.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (report.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const i of report.issues) lines.push(`  ✗ ${i}`);
  }
  lines.push("");
  lines.push("Human probe:");
  lines.push("  Field walk kit: npm run city-game:network-lens-gt8-kit -- --production");
  lines.push("  Open /play/cedar-rapids/comprehension/gt8-field-walk.html — 10s timer + B1–B7 outdoors");
  lines.push(`  Record GT-8 ☑ in ${COMPREHENSION_RUNBOOK_REL} § Per-tester log`);
  lines.push("After ≥4/5 pass:");
  lines.push('  npm run city-game:network-lens-sign-off -- --pass --apply --reviewer "Name"');
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {{ dateIso: string; detail?: string }} opts
 */
export function applyMapDashboardSf3Gt8Pass(content, opts) {
  if (!content.includes(MAP_DASHBOARD_SF3_GT8_PENDING)) {
    if (mapDashboardSf3Gt8Signed(content)) return content;
    throw new Error("map_dashboard_sf3_gt8_marker_missing");
  }
  const detail = opts.detail ? ` (${opts.detail})` : "";
  return content.replace(
    MAP_DASHBOARD_SF3_GT8_PENDING,
    `| SF-3 GT-8 human orientation (≥4/5 testers, &lt;10s) | ☑ **${opts.dateIso}**${detail} |`
  );
}
