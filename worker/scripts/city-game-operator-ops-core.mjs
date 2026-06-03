/**
 * O1 / O3 / O4 operator ops — assessment + sign-off helpers.
 * @see docs/CITY_GAME_OPERATOR_CUSTODY.md · CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md · CITY_GAME_SUPPORT_MACROS.md
 */

import { assessInstallMapReady } from "./city-game-install-map-core.mjs";
import {
  LAUNCH_CHECKLIST_O1_PENDING,
  LAUNCH_CHECKLIST_O3_PENDING,
  LAUNCH_CHECKLIST_O4_PENDING,
  LAUNCH_CHECKLIST_REL,
  launchChecklistGateSigned,
} from "./city-game-launch-checklist-core.mjs";

export const CUSTODY_REL = "docs/CITY_GAME_OPERATOR_CUSTODY.md";
export const WEEKEND_SCHEDULE_REL = "docs/CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md";
export const SUPPORT_MACROS_REL = "docs/CITY_GAME_SUPPORT_MACROS.md";

export const CUSTODY_PHASE_C_HEADER = "## Phase C ops gate (human — before `CITY_GAME_ENABLED=1` in prod)";

export const WEEKEND_SCHEDULE_O3_PENDING =
  "| Primary + backup operators named for Fri–Sun window | ☐ Pending |";

export const SUPPORT_MACROS_O4_PENDING =
  "| Support team briefed on macros above | ☐ Pending |";

/**
 * @param {string} content
 */
export function custodyPhaseCGateSection(content) {
  const after = content.split(CUSTODY_PHASE_C_HEADER)[1];
  if (!after) return "";
  return after.split("\n##")[0] ?? "";
}

/**
 * @param {string} line
 */
export function phaseCGateRowSigned(line) {
  const parts = line.split("|");
  if (parts.length < 4) return false;
  const doneCell = parts[2]?.trim() ?? "";
  return doneCell.startsWith("☑");
}

/**
 * @param {string} content
 */
export function custodyPhaseCGateReady(content) {
  const section = custodyPhaseCGateSection(content);
  const dataRows = section
    .split("\n")
    .filter(
      (line) =>
        /^\|\s*Game-operator/.test(line) ||
        /^\|\s*Season root/.test(line) ||
        /^\|\s*`season_root_profile_id`/.test(line) ||
        /^\|\s*All 15 node QRs/.test(line) ||
        /^\|\s*Weekend operator roster/.test(line) ||
        /^\|\s*`node_14` care-loop/.test(line)
    );
  return dataRows.length >= 6 && dataRows.every((line) => phaseCGateRowSigned(line));
}

/**
 * @param {string} content
 */
export function weekendScheduleO3Ready(content) {
  if (content.includes(WEEKEND_SCHEDULE_O3_PENDING)) return false;
  return content.includes("Primary + backup operators named") && content.includes("☑");
}

/**
 * @param {string} content
 */
export function supportMacrosO4Ready(content) {
  if (content.includes(SUPPORT_MACROS_O4_PENDING)) return false;
  return content.includes("Support team briefed on macros") && content.includes("☑");
}

/**
 * @param {{
 *   custodyDoc?: string | null;
 *   weekendScheduleDoc?: string | null;
 *   supportMacrosDoc?: string | null;
 *   installMapDoc?: string | null;
 *   launchChecklistDoc?: string | null;
 *   localSeed?: { nodes?: Array<{ node_id?: string; scan_url?: string; local_scan_url?: string }> } | null;
 * }} input
 */
export function assessOperatorOpsReady(input) {
  const custody = input.custodyDoc ?? "";
  const weekend = input.weekendScheduleDoc ?? "";
  const support = input.supportMacrosDoc ?? "";
  const launch = input.launchChecklistDoc ?? "";
  const installMap = assessInstallMapReady({
    installMapDoc: input.installMapDoc,
    localSeed: input.localSeed,
  });

  const o1DocReady = custodyPhaseCGateReady(custody);
  const o1Checklist = launchChecklistGateSigned(launch, "O1") === true;
  const o2Checklist = launchChecklistGateSigned(launch, "O2") === true;
  const o3DocReady = weekendScheduleO3Ready(weekend);
  const o3Checklist = launchChecklistGateSigned(launch, "O3") === true;
  const o4DocReady = supportMacrosO4Ready(support);
  const o4Checklist = launchChecklistGateSigned(launch, "O4") === true;

  return {
    o1: { docReady: o1DocReady, checklistSigned: o1Checklist },
    o2: {
      docReady: installMap.qrReady && installMap.contactsReady && installMap.installedReady,
      checklistSigned: o2Checklist,
      installMap,
    },
    o3: { docReady: o3DocReady, checklistSigned: o3Checklist },
    o4: { docReady: o4DocReady, checklistSigned: o4Checklist },
  };
}

/**
 * @param {ReturnType<typeof assessOperatorOpsReady>} ops
 */
export function formatOperatorOpsPreflightReport(ops) {
  const lines = ["Cedar Rapids · operator ops preflight (O1–O4)", ""];
  lines.push(
    `O1 custody: doc ${ops.o1.docReady ? "☑" : "☐"} · checklist ${ops.o1.checklistSigned ? "☑" : "☐"}`
  );
  lines.push(
    `O2 install map: QR ${ops.o2.installMap.qrReady ? "☑" : "☐"} · Installed ${ops.o2.installMap.installedReady ? "☑" : "☐"} · node_14 ${ops.o2.installMap.contactsReady ? "☑" : "☐"} · checklist ${ops.o2.checklistSigned ? "☑" : "☐"}`
  );
  lines.push(
    `O3 weekend roster: doc ${ops.o3.docReady ? "☑" : "☐"} · checklist ${ops.o3.checklistSigned ? "☑" : "☐"}`
  );
  lines.push(
    `O4 support macros: doc ${ops.o4.docReady ? "☑" : "☐"} · checklist ${ops.o4.checklistSigned ? "☑" : "☐"}`
  );
  lines.push("");
  lines.push("After human confirmation:");
  lines.push("  npm run city-game:operator-ops-sign-off -- --mark O1 --apply");
  lines.push("  npm run city-game:operator-ops-sign-off -- --mark O3 --apply");
  lines.push("  npm run city-game:operator-ops-sign-off -- --mark O4 --apply");
  lines.push("  npm run city-game:install-map-sign-off -- --mark-o2 --apply");
  lines.push("");
  lines.push("Parallel with C3 physical install:");
  lines.push("  npm run city-game:install-qa-preflight");
  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyCustodyPhaseCGatePass(content, opts) {
  if (!content.includes(CUSTODY_PHASE_C_HEADER)) {
    throw new Error("custody_phase_c_missing");
  }
  const [before, after = ""] = content.split(CUSTODY_PHASE_C_HEADER);
  const sectionEnd = after.indexOf("\n##");
  const section = sectionEnd === -1 ? after : after.slice(0, sectionEnd);
  const tail = sectionEnd === -1 ? "" : after.slice(sectionEnd);
  const updated = section.replace(/\|\s*☐(\s*\|)/g, `| ☑ **${opts.dateIso}**$1`);
  if (updated === section) {
    throw new Error("custody_phase_c_marker_missing");
  }
  return `${before}${CUSTODY_PHASE_C_HEADER}${updated}${tail}`;
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyWeekendScheduleO3Pass(content, opts) {
  if (!content.includes(WEEKEND_SCHEDULE_O3_PENDING)) {
    if (weekendScheduleO3Ready(content)) return content;
    throw new Error("weekend_schedule_o3_marker_missing");
  }
  return content.replace(
    WEEKEND_SCHEDULE_O3_PENDING,
    `| Primary + backup operators named for Fri–Sun window | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applySupportMacrosO4Pass(content, opts) {
  if (!content.includes(SUPPORT_MACROS_O4_PENDING)) {
    if (supportMacrosO4Ready(content)) return content;
    throw new Error("support_macros_o4_marker_missing");
  }
  return content.replace(
    SUPPORT_MACROS_O4_PENDING,
    `| Support team briefed on macros above | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistO1Pass(content, opts) {
  if (!content.includes(LAUNCH_CHECKLIST_O1_PENDING)) {
    if (launchChecklistGateSigned(content, "O1")) return content;
    throw new Error("launch_checklist_o1_marker_missing");
  }
  return content.replace(
    LAUNCH_CHECKLIST_O1_PENDING,
    `| O1 | Game-operator private key in custody — [\`CITY_GAME_OPERATOR_CUSTODY.md\`](CITY_GAME_OPERATOR_CUSTODY.md) | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistO3Pass(content, opts) {
  if (!content.includes(LAUNCH_CHECKLIST_O3_PENDING)) {
    if (launchChecklistGateSigned(content, "O3")) return content;
    throw new Error("launch_checklist_o3_marker_missing");
  }
  return content.replace(
    LAUNCH_CHECKLIST_O3_PENDING,
    `| O3 | Weekend operator schedule assigned — [\`CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md\`](CITY_GAME_WEEKEND_OPERATOR_SCHEDULE.md) | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyLaunchChecklistO4Pass(content, opts) {
  if (!content.includes(LAUNCH_CHECKLIST_O4_PENDING)) {
    if (launchChecklistGateSigned(content, "O4")) return content;
    throw new Error("launch_checklist_o4_marker_missing");
  }
  return content.replace(
    LAUNCH_CHECKLIST_O4_PENDING,
    `| O4 | Support team has [\`CITY_GAME_SUPPORT_MACROS.md\`](CITY_GAME_SUPPORT_MACROS.md) | ☑ **${opts.dateIso}** |`
  );
}

/**
 * @param {string[]} argv
 */
export function parseOperatorOpsSignOffArgs(argv) {
  const apply = argv.includes("--apply");
  /** @type {string[]} */
  const mark = [];
  let dateIso = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--mark") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        mark.push(argv[++i].toUpperCase());
      }
    }
  }

  return { apply, mark, dateIso };
}

export { LAUNCH_CHECKLIST_REL };
