import { describe, expect, it } from "vitest";

import {
  applyBulletinScheduleToStreams,
  resolveActiveBulletinSlot,
  shouldApplyBulletinSchedule,
} from "../src/city-game/bulletin-schedule";

const SEASON = {
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
  bulletin_schedule: {
    entries: [
      {
        node_id: "node_01",
        slots: [
          {
            after_start_hours: 0,
            bulletin: "Shift west, mural alley stays safe",
            relay_status: "Open · 18 min",
            controller: "Red team",
          },
          {
            after_start_hours: 6,
            bulletin: "Regroup at café window",
            relay_status: "Open · truce window",
          },
        ],
      },
    ],
  },
};

describe("bulletin-schedule", () => {
  it("resolves latest eligible slot after season start", () => {
    const atOpen = resolveActiveBulletinSlot(
      "node_01",
      new Date("2026-06-06T19:00:00-05:00"),
      SEASON
    );
    expect(atOpen?.bulletin).toBe("Shift west, mural alley stays safe");

    const atNoon = resolveActiveBulletinSlot(
      "node_01",
      new Date("2026-06-07T12:00:00-05:00"),
      SEASON
    );
    expect(atNoon?.bulletin).toBe("Regroup at café window");
  });

  it("applies schedule to relay streams when play is open", () => {
    const streams = applyBulletinScheduleToStreams(
      [
        { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
        { id: "relay", class: "route", label: "Relay status", value: "Closed" },
        { id: "bulletin", class: "narrative", label: "Bulletin", value: "Awaiting season open" },
      ],
      "node_01",
      new Date("2026-06-06T19:00:00-05:00"),
      SEASON,
      {
        nodeRole: "relay_gate",
        gameMeta: { compromised: false } as never,
        seasonWindowPhase: "open",
      }
    );
    expect(streams.find((s) => s.id === "bulletin")?.value).toBe(
      "Shift west, mural alley stays safe"
    );
    expect(streams.find((s) => s.id === "relay")?.value).toBe("Open · 18 min");
    expect(streams.find((s) => s.id === "territory")?.value).toBe("Red team");
  });

  it("skips schedule when compromised or not relay_gate", () => {
    expect(
      shouldApplyBulletinSchedule({
        nodeRole: "sanctuary",
        gameMeta: { compromised: false } as never,
        seasonWindowPhase: "open",
      })
    ).toBe(false);
    const unchanged = applyBulletinScheduleToStreams(
      [{ id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored" }],
      "node_01",
      new Date("2026-06-06T19:00:00-05:00"),
      SEASON,
      {
        nodeRole: "relay_gate",
        gameMeta: { compromised: true } as never,
        seasonWindowPhase: "open",
      }
    );
    expect(unchanged[0].value).toBe("Stored");
  });

  it("uses hour-0 slots in local dev when window dates unset", () => {
    const slot = resolveActiveBulletinSlot(
      "node_01",
      new Date("2026-06-02T12:00:00-05:00"),
      {
        window: { starts_at: null, ends_at: null },
        bulletin_schedule: SEASON.bulletin_schedule,
      }
    );
    expect(slot?.bulletin).toBe("Shift west, mural alley stays safe");
  });
});
