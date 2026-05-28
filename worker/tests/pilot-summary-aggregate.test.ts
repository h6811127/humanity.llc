import { describe, expect, it } from "vitest";

import {
  aggregatePilotSummaries,
  formatPilotRollupReport,
  parsePilotSummary,
} from "../../site/js/pilot-summary-aggregate.mjs";

const STATUS_PLATE_ROW = {
  kind: "humanity_status_plate_pilot_summary_v1",
  profile_id: "p1",
  handle: "river_studio",
  exported_at: "2026-05-27T12:00:00.000Z",
  update_count: 2,
  update_target: 2,
  last_updated_at: "2026-05-27T11:00:00.000Z",
  milestones: { printed: true, second_device_scan: true },
  habit_loop_closed: true,
};

const LOST_ITEM_ROW = {
  kind: "humanity_lost_item_relay_pilot_summary_v1",
  profile_id: "p2",
  handle: "keys_relay",
  exported_at: "2026-05-27T12:00:00.000Z",
  update_count: 1,
  update_target: 1,
  last_updated_at: "2026-05-27T10:00:00.000Z",
  milestones: { printed: true, second_device_scan: false },
  habit_loop_closed: false,
};

describe("pilot-summary-aggregate", () => {
  it("parses status plate and lost-item summary exports", () => {
    expect(parsePilotSummary(JSON.stringify(STATUS_PLATE_ROW))).toEqual(STATUS_PLATE_ROW);
    expect(parsePilotSummary(JSON.stringify(LOST_ITEM_ROW))).toEqual(LOST_ITEM_ROW);
  });

  it("rejects unknown summary kinds", () => {
    expect(() =>
      parsePilotSummary(JSON.stringify({ ...STATUS_PLATE_ROW, kind: "other_v1" }))
    ).toThrow(/recognized pilot summary/);
  });

  it("aggregates rollup counts across stewards", () => {
    const rollup = aggregatePilotSummaries([STATUS_PLATE_ROW, LOST_ITEM_ROW]);
    expect(rollup.total).toBe(2);
    expect(rollup.habit_loop_closed).toBe(1);
    expect(rollup.printed).toBe(2);
    expect(rollup.second_device_scan).toBe(1);
    expect(rollup.update_target_met).toBe(2);
    expect(rollup.by_kind["humanity_status_plate_pilot_summary_v1"]).toBe(1);
    expect(rollup.by_kind["humanity_lost_item_relay_pilot_summary_v1"]).toBe(1);
  });

  it("formatPilotRollupReport includes handles and closed counts", () => {
    const report = formatPilotRollupReport(
      aggregatePilotSummaries([STATUS_PLATE_ROW, LOST_ITEM_ROW])
    );
    expect(report).toContain("Habit loop closed: 1/2");
    expect(report).toContain("@river_studio");
    expect(report).toContain("@keys_relay");
  });
});
