/**
 * Lane C — field momentum gates (summer open).
 * @see docs/CITY_GAME_SUMMER_LANE_C.md
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessInstallQaEngineeringReady,
  installQaDocHasPhysicalPass,
  INSTALL_QA_REL,
} from "./city-game-install-qa-core.mjs";
import {
  assessLaunchChecklistReady,
  launchChecklistGateSigned,
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";
import { assessWranglerCityGameEnabled } from "./city-game-launch-e4-core.mjs";
import { assessLaunchSurfacesReady } from "./city-game-launch-surfaces-core.mjs";
import { validateSeasonSummerS2 } from "./city-game-summer-s2-core.mjs";
import { validateSeasonSummerS3 } from "./city-game-summer-s3-core.mjs";
import { validateSeasonSummerS4 } from "./city-game-summer-s4-core.mjs";
import { validateSeasonSummerS5 } from "./city-game-summer-s5-core.mjs";
import { validateSeasonSummerS6 } from "./city-game-summer-s6-core.mjs";
import { LANE_C_SUMMER_MARKETING_TARGET } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {Record<string, unknown>} season
 */
export function seasonRegistryNodeCount(season) {
  return Array.isArray(season.nodes) ? season.nodes.length : 0;
}

/**
 * @param {Record<string, unknown>} season
 */
export function assessLaneCDensity(season) {
  const registry = seasonRegistryNodeCount(season);
  const target = LANE_C_SUMMER_MARKETING_TARGET;
  const issues = [];
  const warnings = [];

  if (registry < target) {
    warnings.push(
      `Registry ${registry}/${target} nodes — summer marketing at ~${target} needs wave-open + mint (WS-SCALE SC-2+) before B7 at ${target}.`
    );
  } else if (registry > target) {
    warnings.push(`Registry ${registry} exceeds Lane C target ${target} — confirm install map.`);
  }

  return {
    registry,
    target,
    readyForSummerMarketing: registry >= target,
    issues,
    warnings,
  };
}

/**
 * @param {Record<string, unknown>} season
 */
export function assessLaneBMomentum(season) {
  const checks = [
    { id: "SW-S2b", result: validateSeasonSummerS2(season) },
    { id: "SW-S3b", result: validateSeasonSummerS3(season) },
    { id: "SW-S4b", result: validateSeasonSummerS4(season) },
    { id: "SW-S5b", result: validateSeasonSummerS5(season) },
    { id: "SW-S6b", result: validateSeasonSummerS6(season) },
  ];
  const failed = checks.filter((c) => !c.result.ok);
  return {
    ok: failed.length === 0,
    checks,
    issues: failed.flatMap((c) => c.result.issues.map((i) => `${c.id}: ${i}`)),
  };
}

/**
 * @param {Record<string, unknown>} season
 */
export function assessLaneCMerch(season) {
  const rows = season.mobile_lore_enrollment ?? [];
  const badges = rows.filter((r) => r?.role === "faction_badge");
  const couriers = rows.filter((r) => r?.role === "mobile_lore");
  return {
    enrollmentCount: rows.length,
    factionBadgeCount: badges.length,
    courierCount: couriers.length,
    ready: badges.length >= 4,
    issues:
      badges.length < 4
        ? ["Fewer than 4 faction_badge enrollments — npm run city-game:merge-summer-s5-enrollment -- --write"]
        : [],
  };
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   installQaDoc?: string;
 *   launchChecklistDoc?: string;
 *   localSeed?: { nodes?: unknown[] } | null;
 *   productionSeed?: { nodes?: unknown[] } | null;
 *   wranglerToml?: string;
 * }} input
 */
export function assessLaneC(input) {
  const registry = seasonRegistryNodeCount(input.season);
  const density = assessLaneCDensity(input.season);
  const laneB = assessLaneBMomentum(input.season);
  const merch = assessLaneCMerch(input.season);
  const surfaces = assessLaunchSurfacesReady(input.season);

  const installQaDoc =
    input.installQaDoc ??
    (existsSync(join(root, INSTALL_QA_REL))
      ? readFileSync(join(root, INSTALL_QA_REL), "utf8")
      : "");
  const launchChecklistDoc =
    input.launchChecklistDoc ??
    (existsSync(join(root, LAUNCH_CHECKLIST_REL))
      ? readFileSync(join(root, LAUNCH_CHECKLIST_REL), "utf8")
      : "");

  const c3 = assessInstallQaEngineeringReady({
    installQaDoc,
    localSeed: input.localSeed,
    productionSeed: input.productionSeed,
    requiredNodeCount: registry,
  });

  const c5 = assessLaunchChecklistReady({
    launchChecklistDoc,
    scanAnalyticsGateOk: true,
  });

  const wrangler = input.wranglerToml ?? "";
  const cityGameEnabledInWrangler = input.wranglerToml
    ? assessWranglerCityGameEnabled(wrangler).enabled
    : null;

  const humanB7 = installQaDocHasPhysicalPass(installQaDoc, registry);

  const humanC5 = c5.c5Signed;

  const blockers = [];
  if (!laneB.ok) blockers.push("Lane B summer canon — fix summer S2–S6 merges on season JSON");
  if (!c3.ready) blockers.push(...c3.issues.map((i) => `C3 engineering: ${i}`));
  if (!humanB7) {
    blockers.push(
      `B7 physical install QA — ≥3 phones × ${registry} nodes (npm run city-game:install-qa-walk -- --lan)`
    );
  }
  if (!humanC5) blockers.push("C5 launch checklist — npm run city-game:launch-checklist-preflight");
  if (!cityGameEnabledInWrangler && input.wranglerToml) {
    blockers.push("Production CITY_GAME_ENABLED=1 in worker/wrangler.toml (launch day E4)");
  }

  return {
    registry,
    density,
    laneB,
    merch,
    surfaces,
    c3,
    c5,
    cityGameEnabledInWrangler: input.wranglerToml ? cityGameEnabledInWrangler : null,
    humanB7,
    humanC5,
    launchP2Signed: launchChecklistGateSigned(launchChecklistDoc, "P2"),
    launchO5Signed: launchChecklistGateSigned(launchChecklistDoc, "O5"),
    blockers,
    readyForSummerMarketing:
      density.readyForSummerMarketing &&
      laneB.ok &&
      humanB7 &&
      humanC5 &&
      c3.ready &&
      surfaces.issues.length === 0,
  };
}

/**
 * @param {ReturnType<typeof assessLaneC>} report
 */
export function formatLaneCPreflightReport(report) {
  const lines = ["Cedar Rapids · Lane C summer momentum preflight", ""];
  lines.push(`Registry footprint: ${report.registry} nodes (marketing target ${report.density.target})`);
  lines.push(
    `Density gate: ${report.density.readyForSummerMarketing ? "☑" : "☐"} ${report.registry}/${report.density.target} for “live summer” marketing`
  );
  lines.push(`Lane B (S2–S6): ${report.laneB.ok ? "☑" : "☐"} season JSON canon`);
  lines.push(
    `Merch enrollments: ${report.merch.ready ? "☑" : "☐"} ${report.merch.factionBadgeCount} faction badges · ${report.merch.courierCount} courier`
  );
  lines.push(`C3 engineering: ${report.c3.ready ? "☑" : "☐"}`);
  lines.push(`B7 physical (human): ${report.humanB7 ? "☑" : "☐"} ≥3 phones × ${report.registry}`);
  lines.push(`C5 launch checklist (human): ${report.humanC5 ? "☑" : "☐"}`);
  lines.push(
    `Launch surfaces: ${report.surfaces.issues.length === 0 ? "☑" : "☐"} season root + window`
  );
  if (report.cityGameEnabledInWrangler != null) {
    lines.push(
      `CITY_GAME_ENABLED (wrangler): ${report.cityGameEnabledInWrangler ? "☑" : "☐"} (launch day only if not yet live)`
    );
  }
  lines.push(
    `\nSummer marketing ready: ${report.readyForSummerMarketing ? "☑" : "☐"} (all gates above)`
  );

  const allIssues = [
    ...report.density.issues,
    ...report.density.warnings,
    ...report.laneB.issues,
    ...report.merch.issues,
    ...report.c3.issues,
    ...report.c3.warnings,
    ...report.surfaces.issues,
    ...report.c5.pending.map((p) => `C5 pending: ${p}`),
  ];
  if (allIssues.length) {
    lines.push("", "Notes:");
    for (const i of allIssues) lines.push(`  • ${i}`);
  }
  if (report.blockers.length) {
    lines.push("", "Blockers:");
    for (const b of report.blockers) lines.push(`  • ${b}`);
  }

  lines.push("", "Playbook: docs/CITY_GAME_SUMMER_LANE_C.md");
  lines.push("Friday beat: docs/CITY_GAME_OPERATOR_RUNBOOK.md § Summer S3b");
  return lines.join("\n");
}
