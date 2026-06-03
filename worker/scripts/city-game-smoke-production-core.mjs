/**
 * C4 production scan smoke helpers.
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-CR C4
 */

import {
  findLaunchChecklistRow,
  launchChecklistGateSigned,
  launchChecklistRowIsSigned,
} from "./city-game-launch-checklist-core.mjs";
import {
  INSTALL_QA_REQUIRED_NODE_COUNT,
  INSTALL_QA_SPOT_EXPECTATIONS,
  INSTALL_QA_SPOT_NODE_IDS,
} from "./city-game-smoke-local-core.mjs";

export const DEFAULT_PRODUCTION_API = "https://humanity.llc";

export const LAUNCH_CHECKLIST_REL = "docs/CITY_GAME_LAUNCH_CHECKLIST.md";
export const LAUNCH_CHECKLIST_E5_PENDING =
  "| E5 | Scan template live on staging/production for `node_01`, `node_04`, `node_07` | ☐ · `npm run city-game:smoke-production` after preflight probe (pre-launch = dormant OK) |";

/**
 * @param {{ window?: { starts_at?: string; ends_at?: string } } | null | undefined} season
 * @param {Date} [now]
 */
export function isSeasonPlayOpenForSmoke(season, now = new Date()) {
  const start = season?.window?.starts_at;
  if (!start) return true;
  const startMs = Date.parse(start);
  if (Number.isNaN(startMs)) return true;
  const endMs = season?.window?.ends_at ? Date.parse(season.window.ends_at) : null;
  const nowMs = now.getTime();
  if (nowMs < startMs) return false;
  if (endMs != null && !Number.isNaN(endMs) && nowMs > endMs) return false;
  return true;
}

/**
 * Pre-launch: game template + dormant note. In-season: coop/contribute spot checks.
 * @param {{ window?: { starts_at?: string; ends_at?: string } } | null | undefined} season
 * @param {Date} [now]
 */
export function spotExpectationsForProductionProbe(season, now = new Date()) {
  const open = isSeasonPlayOpenForSmoke(season, now);
  /** @type {Record<string, { requireCoopHint?: boolean; requireContributeBlock?: boolean; expectDormant?: boolean }>} */
  const out = {};
  for (const nodeId of INSTALL_QA_SPOT_NODE_IDS) {
    const base = INSTALL_QA_SPOT_EXPECTATIONS[nodeId] ?? {};
    out[nodeId] = open ? { ...base } : { expectDormant: true };
  }
  return out;
}

/**
 * @param {string[]} argv
 */
export function parseProductionSmokeSignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let nodes = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--nodes" && argv[i + 1]) {
      nodes = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, nodes };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveProductionSmokeSignOffResult(parsed) {
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
 *   nodes?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function productionSmokeSignOffSummaryLines(input) {
  const lines = [
    "C4 production scan smoke — sign-off record",
    "",
    `  Date:   ${input.dateIso}`,
    `  Nodes:  ${input.nodes || "node_01, node_04, node_07 (spot)"}`,
    `  Result: ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates launch checklist E5.",
      "Engineering gate: npm run city-game:smoke-production-preflight -- --probe"
    );
  } else {
    lines.push(
      "On fail: confirm CITY_GAME_ENABLED=1, redeploy worker, re-run npm run city-game:smoke-production"
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; nodes?: string }} opts
 */
export function applyLaunchChecklistE5Pass(content, opts) {
  const line = findLaunchChecklistRow(content, "E5");
  if (!line) {
    throw new Error("launch_checklist_e5_marker_missing");
  }
  if (launchChecklistRowIsSigned(line)) {
    return content;
  }
  const detail = opts.nodes || "node_01, node_04, node_07";
  const updated = line.replace(
    /\|\s*☐[^|]*\|$/,
    `| ☑ **${opts.dateIso}** · ${detail} |`
  );
  if (updated === line) {
    throw new Error("launch_checklist_e5_marker_missing");
  }
  return content.replace(line, updated);
}

/**
 * @param {string} content
 */
export function launchChecklistE5Signed(content) {
  return launchChecklistGateSigned(content, "E5") === true;
}

/**
 * @param {{
 *   productionSeed?: { nodes?: Array<{ node_id?: string; scan_url?: string }> } | null;
 *   checkAll?: boolean;
 * }} input
 */
export function selectProductionSmokeNodes(input) {
  const nodes = input.productionSeed?.nodes ?? [];
  const withUrl = nodes.filter((n) => n.node_id && n.scan_url);
  if (input.checkAll) return withUrl;
  return withUrl.filter((n) => INSTALL_QA_SPOT_NODE_IDS.includes(String(n.node_id)));
}

/**
 * @param {{
 *   productionSeed?: { nodes?: Array<{ node_id?: string; scan_url?: string }> } | null;
 * }} input
 */
export function assessProductionSmokePreflight(input) {
  const issues = [];
  const warnings = [];
  const nodes = input.productionSeed?.nodes ?? [];
  const count = nodes.filter((n) => n.node_id && n.scan_url).length;

  if (!input.productionSeed) {
    issues.push(
      "Missing worker/.local/city-game-production-seed.json — npm run city-game:seed-production -- --confirm-production"
    );
  } else if (count < INSTALL_QA_REQUIRED_NODE_COUNT) {
    warnings.push(`Production seed has ${count}/${INSTALL_QA_REQUIRED_NODE_COUNT} scan URLs`);
  }

  const spot = selectProductionSmokeNodes({ productionSeed: input.productionSeed, checkAll: false });
  if (input.productionSeed && !spot.length) {
    issues.push(`Production seed missing spot nodes: ${INSTALL_QA_SPOT_NODE_IDS.join(", ")}`);
  }

  return {
    ready: issues.length === 0,
    nodeCount: count,
    spotCount: spot.length,
    issues,
    warnings,
  };
}

/**
 * @param {{
 *   ready: boolean;
 *   nodeCount: number;
 *   spotCount: number;
 *   issues: string[];
 *   warnings: string[];
 *   probeOk?: boolean | null;
 * }} c4
 * @returns {string}
 */
export function formatProductionSmokePreflightReport(c4) {
  const lines = ["Cedar Rapids · production scan smoke preflight (C4)", ""];
  lines.push(`C4 engineering: ${c4.ready ? "☑" : "☐"} production seed + spot scan URLs`);
  lines.push(`  Nodes with scan_url: ${c4.nodeCount}/${INSTALL_QA_REQUIRED_NODE_COUNT}`);
  lines.push(`  Spot nodes (${INSTALL_QA_SPOT_NODE_IDS.join(", ")}): ${c4.spotCount}`);
  if (c4.probeOk === true) {
    lines.push("  HTTP probe (spot nodes): ☑ game template on API_ORIGIN");
  } else if (c4.probeOk === false) {
    lines.push("  HTTP probe (spot nodes): ☐ failed — confirm CITY_GAME_ENABLED=1 and season phase");
  }
  if (c4.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of c4.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (c4.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const i of c4.issues) lines.push(`  ✗ ${i}`);
  }
  lines.push("");
  lines.push("Run after worker deploy with CITY_GAME_ENABLED=1:");
  lines.push("  npm run city-game:smoke-production");
  lines.push("  npm run city-game:smoke-production -- --all");
  lines.push("");
  lines.push("Probe now:");
  lines.push("  npm run city-game:smoke-production-preflight -- --probe");
  lines.push("");
  lines.push("After pass:");
  lines.push(
    "  npm run city-game:smoke-production-sign-off -- --pass --apply --nodes node_01,node_04,node_07"
  );
  return lines.join("\n");
}

export { INSTALL_QA_SPOT_EXPECTATIONS };
