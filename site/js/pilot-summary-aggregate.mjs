/**
 * Parse and aggregate device-local pilot summary exports (Steps 4 / 7 field pilots).
 * No network I/O — founder pastes JSON from stewards' Copy pilot summary.
 *
 * @see docs/STATUS_PLATE_PILOT.md
 * @see docs/LOST_ITEM_RELAY_PILOT.md
 */

export const PILOT_SUMMARY_KINDS = [
  "humanity_status_plate_pilot_summary_v1",
  "humanity_lost_item_relay_pilot_summary_v1",
];

/**
 * @typedef {"humanity_status_plate_pilot_summary_v1" | "humanity_lost_item_relay_pilot_summary_v1"} PilotSummaryKind
 */

/**
 * @typedef {{
 *   kind: PilotSummaryKind;
 *   profile_id: string | null;
 *   handle: string | null;
 *   exported_at: string;
 *   update_count: number;
 *   update_target: number;
 *   last_updated_at: string | null;
 *   milestones: { printed?: boolean; second_device_scan?: boolean };
 *   habit_loop_closed: boolean;
 * }} PilotSummary
 */

/**
 * @typedef {{
 *   total: number;
 *   by_kind: Partial<Record<PilotSummaryKind, number>>;
 *   habit_loop_closed: number;
 *   printed: number;
 *   second_device_scan: number;
 *   update_target_met: number;
 *   rows: PilotSummary[];
 * }} PilotRollup
 */

/**
 * @param {unknown} value
 * @returns {value is PilotSummary}
 */
export function isPilotSummary(value) {
  if (!value || typeof value !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (value);
  if (!PILOT_SUMMARY_KINDS.includes(/** @type {PilotSummaryKind} */ (row.kind))) {
    return false;
  }
  if (typeof row.update_count !== "number" || typeof row.update_target !== "number") {
    return false;
  }
  if (typeof row.habit_loop_closed !== "boolean") return false;
  if (!row.milestones || typeof row.milestones !== "object") return false;
  return true;
}

/**
 * @param {string} text
 * @returns {PilotSummary}
 */
export function parsePilotSummary(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!isPilotSummary(parsed)) {
    throw new Error("Not a recognized pilot summary export");
  }
  return parsed;
}

/**
 * @param {PilotSummary[]} rows
 * @returns {PilotRollup}
 */
export function aggregatePilotSummaries(rows) {
  /** @type {PilotRollup} */
  const rollup = {
    total: rows.length,
    by_kind: {},
    habit_loop_closed: 0,
    printed: 0,
    second_device_scan: 0,
    update_target_met: 0,
    rows,
  };
  for (const row of rows) {
    rollup.by_kind[row.kind] = (rollup.by_kind[row.kind] ?? 0) + 1;
    if (row.habit_loop_closed) rollup.habit_loop_closed += 1;
    if (row.milestones.printed) rollup.printed += 1;
    if (row.milestones.second_device_scan) rollup.second_device_scan += 1;
    if (row.update_count >= row.update_target) rollup.update_target_met += 1;
  }
  return rollup;
}

/**
 * @param {PilotRollup} rollup
 * @returns {string}
 */
export function formatPilotRollupReport(rollup) {
  const lines = [
    `Pilot field rollup (${rollup.total} steward${rollup.total === 1 ? "" : "s"})`,
    `Habit loop closed: ${rollup.habit_loop_closed}/${rollup.total}`,
    `Update target met: ${rollup.update_target_met}/${rollup.total}`,
    `Printed: ${rollup.printed}/${rollup.total}`,
    `Second-device scan: ${rollup.second_device_scan}/${rollup.total}`,
  ];
  for (const kind of PILOT_SUMMARY_KINDS) {
    const count = rollup.by_kind[/** @type {PilotSummaryKind} */ (kind)];
    if (count) lines.push(`${kind}: ${count}`);
  }
  lines.push("", "Rows:");
  for (const row of rollup.rows) {
    const handle = row.handle ? `@${row.handle}` : row.profile_id ?? "unknown";
    const flags = [
      row.habit_loop_closed ? "closed" : "open",
      row.milestones.printed ? "printed" : "not-printed",
      row.milestones.second_device_scan ? "2nd-scan" : "no-2nd-scan",
      `${row.update_count}/${row.update_target} updates`,
    ].join(" · ");
    lines.push(
      `- ${handle} (${row.kind.replace("humanity_", "").replace("_pilot_summary_v1", "")}) — ${flags}`
    );
  }
  return lines.join("\n");
}
