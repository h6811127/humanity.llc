/**
 * LO-4 reference network comprehension kit — operator field walk.
 * @see site/js/city-game-reference-network-core.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildReferenceNetworkTeachingKitHtml,
  LO4_COMPREHENSION_MIN_STRANGERS,
  validateReferenceNetworkTeaching,
} from "../../site/js/city-game-reference-network-core.mjs";

export const LO4_KIT_REL = "site/play/cedar-rapids/teaching/index.html";
export const CR_SEASON_REL = "site/data/city-game-cr-season-01.json";
export const SHOWCASE_STATUS_PLATE_REL = "site/data/showcase-status-plate.json";

/**
 * @param {string} root
 */
export function loadPilotSeason(root) {
  return JSON.parse(readFileSync(join(root, CR_SEASON_REL), "utf8"));
}

/**
 * @param {string} root
 */
export function loadShowcaseStatusPlateUrl(root) {
  try {
    const raw = JSON.parse(readFileSync(join(root, SHOWCASE_STATUS_PLATE_REL), "utf8"));
    return typeof raw.scan_url === "string" ? raw.scan_url.trim() : "";
  } catch {
    return "";
  }
}

/**
 * @param {string} root
 * @param {{ production?: boolean }} [opts]
 */
export function buildLo4KitHtml(root, opts = {}) {
  const season = loadPilotSeason(root);
  const production = opts.production === true;
  const charter =
    season.network_charter && typeof season.network_charter === "object"
      ? { ...season.network_charter }
      : {};
  if (!charter.status_plate_scan_url) {
    charter.status_plate_scan_url = loadShowcaseStatusPlateUrl(root);
  }
  const mergedSeason = { ...season, network_charter: charter };

  return buildReferenceNetworkTeachingKitHtml(mergedSeason, {
    production,
    rulesUrl: production
      ? `https://humanity.llc${String(season.rules_path ?? "/play/cedar-rapids/").trim()}`
      : undefined,
    boardUrl: production
      ? `https://humanity.llc${String(season.rules_path ?? "/play/cedar-rapids/").trim().replace(/\/?$/, "/")}map/`
      : undefined,
    statusPlateUrl: charter.status_plate_scan_url,
    gameNodeUrl:
      typeof charter.game_node_scan_url === "string" ? charter.game_node_scan_url : undefined,
  });
}

/**
 * @param {string} root
 */
export function assessLo4KitReady(root) {
  const season = loadPilotSeason(root);
  const teaching = validateReferenceNetworkTeaching(season);
  const issues = [...teaching.issues];
  return {
    ready: issues.length === 0,
    issues,
    minStrangers: LO4_COMPREHENSION_MIN_STRANGERS,
    kitRel: LO4_KIT_REL,
  };
}

/**
 * @param {{ ready: boolean; issues: string[]; minStrangers: number; kitRel: string }} report
 */
export function formatLo4KitPreflightReport(report) {
  const lines = [
    "LO-4 / C2 reference network comprehension (engineering)",
    "",
    `  ${report.ready ? "☑" : "☐"} Seven-surface teaching package on rules + board + portal`,
    `  ${report.ready ? "☑" : "☐"} Kit page ${report.kitRel}`,
    `  ☐ Human — ≥${report.minStrangers} un coached strangers (RN-1–RN-5)`,
    "",
  ];
  if (report.issues.length) {
    lines.push("Blockers:");
    for (const issue of report.issues) lines.push(`  - ${issue}`);
  } else {
    lines.push("Regenerate: npm run city-game:reference-network-kit");
    lines.push("Human gate: LO-4 integrated walk — game node + status plate scans");
  }
  return lines.join("\n");
}
