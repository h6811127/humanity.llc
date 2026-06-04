/**
 * Lane C Phase 3 — launch surfaces + C5/E4 status (read-only).
 * @see docs/CITY_GAME_SUMMER_LANE_C.md § Phase 3
 */
import { assessLaunchChecklistReady } from "./city-game-launch-checklist-core.mjs";
import { assessWranglerCityGameEnabled } from "./city-game-launch-e4-core.mjs";
import {
  assessLaneCDensity,
  seasonRegistryNodeCount,
} from "./city-game-lane-c-core.mjs";
import { LANE_C_SUMMER_MARKETING_TARGET } from "./city-game-smoke-local-core.mjs";
import { installQaDocHasPhysicalPass } from "./city-game-install-qa-core.mjs";
import {
  assessLaunchSurfacesApplied,
  assessLaunchSurfacesReady,
  auditAllLaunchSurfacesCopy,
} from "./city-game-launch-surfaces-core.mjs";
import { auditRulesPageVouchCopy } from "./city-game-vouch-copy-core.mjs";

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   rulesHtml: string;
 *   researchHtmlByRel: Record<string, string>;
 *   launchChecklistDoc?: string;
 *   installQaDoc?: string;
 *   wranglerToml?: string;
 *   launchCtx?: { rulesPath?: string };
 *   expectApplied?: boolean;
 *   launchDayReady?: boolean;
 * }} input
 */
export function assessLaneCPhase3(input) {
  const season = input.season;
  const registry = seasonRegistryNodeCount(season);
  const density = assessLaneCDensity(season);
  const surfacesReady = assessLaunchSurfacesReady(season);
  const surfacesApplied = assessLaunchSurfacesApplied(season, {
    rulesHtml: input.rulesHtml,
    researchHtmlByRel: input.researchHtmlByRel,
    launchCtx: input.launchCtx,
  });
  const copyAudit = auditAllLaunchSurfacesCopy({
    rulesHtml: input.rulesHtml,
    researchHtmlByRel: input.researchHtmlByRel,
  });
  const b1 = auditRulesPageVouchCopy(input.rulesHtml);
  const c5 = assessLaunchChecklistReady({
    launchChecklistDoc: input.launchChecklistDoc ?? "",
    scanAnalyticsGateOk: true,
  });
  const e4 = assessWranglerCityGameEnabled(input.wranglerToml ?? "");

  const humanB7 =
    input.installQaDoc != null
      ? installQaDocHasPhysicalPass(input.installQaDoc, registry)
      : null;

  /** @type {string[]} */
  const engineeringBlockers = [];
  if (!surfacesReady.ready) engineeringBlockers.push(...surfacesReady.issues);
  if (!b1.ok) engineeringBlockers.push(...b1.issues.map((i) => `B1 vouch copy: ${i}`));
  if (!copyAudit.ok) engineeringBlockers.push(...copyAudit.issues);
  if (input.expectApplied && !surfacesApplied.applied) {
    engineeringBlockers.push(...surfacesApplied.issues);
  }

  /** @type {string[]} */
  const humanReminders = [];
  if (humanB7 === false) {
    humanReminders.push(
      `B7 physical install — npm run city-game:install-qa-walk -- --lan · sign-off --nodes ${registry}`
    );
  }
  if (!c5.allRequiredSigned) {
    humanReminders.push(`C5 checklist gates pending: ${c5.pending.join(", ")}`);
  }
  if (!c5.c5Signed) {
    humanReminders.push(
      "C5 sign-off row — npm run city-game:launch-checklist-sign-off -- --pass --apply --commander \"Name\""
    );
  }
  if (c5.p3Signed !== true && surfacesApplied.applied) {
    humanReminders.push(
      "P3 ☐ but launch surfaces look applied — mark P3 after visual check (launch-checklist-sign-off --mark P3)"
    );
  }
  if (!e4.enabled && input.wranglerToml) {
    humanReminders.push(e4.hint);
  }
  if (!density.readyForSummerMarketing) {
    humanReminders.push(
      `Summer marketing density ${registry}/${LANE_C_SUMMER_MARKETING_TARGET} — npm run city-game:lane-c-bootstrap -- --write (pilot launch at ${registry} is OK)`
    );
  }

  const launchDayReady =
    surfacesApplied.applied &&
    copyAudit.ok &&
    b1.ok &&
    surfacesReady.ready &&
    c5.readyForLaunchDay &&
    e4.enabled;

  /** @type {string[]} */
  const launchDayBlockers = [];
  if (input.launchDayReady) {
    if (!surfacesApplied.applied) launchDayBlockers.push(...surfacesApplied.issues);
    if (!c5.readyForLaunchDay) {
      launchDayBlockers.push("C5 not ready — complete P1–P5 + O1–O4 and sign-off row");
    }
    if (!e4.enabled) launchDayBlockers.push("E4: CITY_GAME_ENABLED must be 1 in worker/wrangler.toml");
    if (humanB7 === false) {
      launchDayBlockers.push(`B7: physical install QA at ${registry} nodes`);
    }
  }

  return {
    registry,
    density,
    surfacesReady,
    surfacesApplied: surfacesApplied.applied,
    surfacesAppliedIssues: surfacesApplied.issues,
    copyAuditOk: copyAudit.ok,
    b1Ok: b1.ok,
    c5,
    e4,
    humanB7,
    humanReminders,
    engineeringReady: engineeringBlockers.length === 0,
    engineeringBlockers,
    launchDayReady,
    launchDayBlockers,
  };
}

/**
 * @param {ReturnType<typeof assessLaneCPhase3>} report
 * @param {{ expectApplied?: boolean; launchDayReady?: boolean }} [opts]
 */
export function formatLaneCPhase3Report(report, opts = {}) {
  const lines = ["Cedar Rapids · Lane C Phase 3 — launch surfaces + flag (C5 / E4)", ""];
  lines.push(`Season registry: ${report.registry} nodes`);
  lines.push(
    `Launch surfaces ready (season): ${report.surfacesReady.ready ? "☑" : "☐"} root + window`
  );
  lines.push(
    `P3/P4 applied (rules + research): ${report.surfacesApplied ? "☑" : "☐"}`
  );
  lines.push(`B1 vouch copy: ${report.b1Ok ? "☑" : "☐"}`);
  lines.push(`B2 copy audit: ${report.copyAuditOk ? "☑" : "☐"}`);
  lines.push(`E4 wrangler CITY_GAME_ENABLED: ${report.e4.enabled ? "☑" : "☐"}`);
  lines.push(`C5 checklist (human): ${report.c5.c5Signed ? "☑" : "☐"} sign-off row`);
  lines.push(
    `  Required gates P1,P2,P4,P5,O1–O4: ${report.c5.allRequiredSigned ? "☑" : "☐"}`
  );
  if (report.humanB7 != null) {
    lines.push(`B7 physical (human): ${report.humanB7 ? "☑" : "☐"}`);
  }
  lines.push(
    `\nPhase 3 engineering: ${report.engineeringReady ? "☑" : "☐"} (copy + season; surfaces ${
      opts.expectApplied ? "must be applied" : "ready or applied"
    })`
  );
  if (opts.launchDayReady) {
    lines.push(`Launch day bundle: ${report.launchDayReady ? "☑" : "☐"} (E4 + C5 + B7 + applied)`);
  }

  if (report.engineeringBlockers.length) {
    lines.push("", "Engineering blockers:");
    for (const b of report.engineeringBlockers) lines.push(`  • ${b}`);
  }
  if (report.launchDayBlockers.length) {
    lines.push("", "Launch day blockers:");
    for (const b of report.launchDayBlockers) lines.push(`  • ${b}`);
  }
  if (report.humanReminders.length) {
    lines.push("", "Human gates (informational):");
    for (const h of report.humanReminders) lines.push(`  • ${h}`);
  }

  lines.push("", "Existing commands (unchanged):");
  lines.push("  npm run city-game:launch-checklist-preflight");
  lines.push("  npm run city-game:launch-surfaces -- --check");
  lines.push("  npm run city-game:launch-surfaces -- --check --expect-applied");
  lines.push("Launch day: launch-surfaces --apply · build · pages:deploy · wrangler E4 · smoke-production");
  lines.push("Playbook: docs/CITY_GAME_SUMMER_LANE_C.md § Phase 3");
  return lines.join("\n");
}
