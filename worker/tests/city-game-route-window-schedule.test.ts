import { describe, expect, it } from "vitest";

import {
  applyRouteWindowScheduleToStreams,
  isLocalHourInRange,
  localHourInTimeZone,
  resolveActiveRouteWindowSlot,
} from "../src/city-game/route-window-schedule";

const SEASON = {
  window: {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-06-08T22:00:00-05:00",
  },
  route_window_schedule: {
    timezone: "America/Chicago",
    entries: [
      {
        node_id: "node_06",
        slots: [
          {
            after_start_hours: 0,
            local_hour_from: 6,
            local_hour_until: 18,
            route_open: false,
            relay_route: "Closed · opens at sunset",
            coop_hint: "Wait for dusk",
          },
          {
            after_start_hours: 0,
            local_hour_from: 18,
            local_hour_until: 6,
            route_open: true,
            relay_route: "Open · wind path after sunset",
            secondary_route: "Flood path · weather only",
            coop_hint: "Wind route live",
          },
        ],
      },
      {
        node_id: "node_03",
        slots: [
          {
            after_start_hours: 0,
            local_hour_from: 0,
            local_hour_until: 5,
            route_open: true,
            relay_route: "Live · midnight chapter",
            bulletin: "Secret chapter",
          },
          {
            after_start_hours: 0,
            local_hour_from: 5,
            local_hour_until: 24,
            route_open: false,
            relay_route: "Sealed until midnight",
          },
        ],
      },
    ],
  },
};

describe("route-window-schedule", () => {
  it("matches local hour ranges including midnight wrap", () => {
    expect(isLocalHourInRange(20, 18, 6)).toBe(true);
    expect(isLocalHourInRange(3, 18, 6)).toBe(true);
    expect(isLocalHourInRange(12, 18, 6)).toBe(false);
    expect(isLocalHourInRange(4, 0, 5)).toBe(true);
    expect(isLocalHourInRange(10, 5, 24)).toBe(true);
    expect(isLocalHourInRange(4, 5, 24)).toBe(false);
  });

  it("resolves skywalk sunset-open slot at night", () => {
    const slot = resolveActiveRouteWindowSlot(
      "node_06",
      new Date("2026-06-07T21:00:00-05:00"),
      SEASON
    );
    expect(slot?.route_open).toBe(true);
    expect(slot?.relay_route).toContain("Open");
  });

  it("resolves skywalk closed slot in daytime", () => {
    const slot = resolveActiveRouteWindowSlot(
      "node_06",
      new Date("2026-06-07T14:00:00-05:00"),
      SEASON
    );
    expect(slot?.route_open).toBe(false);
    expect(slot?.relay_route).toContain("Closed");
  });

  it("resolves mural midnight chapter", () => {
    const open = resolveActiveRouteWindowSlot(
      "node_03",
      new Date("2026-06-07T02:00:00-05:00"),
      SEASON
    );
    expect(open?.relay_route).toContain("midnight");

    const sealed = resolveActiveRouteWindowSlot(
      "node_03",
      new Date("2026-06-07T10:00:00-05:00"),
      SEASON
    );
    expect(sealed?.relay_route).toContain("Sealed");
  });

  it("applies route streams and coop hint on scan", () => {
    const result = applyRouteWindowScheduleToStreams(
      [
        { id: "territory", class: "place", label: "Split", value: "Dormant" },
        { id: "relay", class: "route", label: "Wind route", value: "Closed" },
        { id: "bulletin", class: "narrative", label: "Flood route", value: "Closed" },
      ],
      "node_06",
      new Date("2026-06-07T21:00:00-05:00"),
      SEASON,
      {
        nodeRole: "route_splitter",
        gameMeta: { compromised: false } as never,
        seasonWindowPhase: "open",
      }
    );
    expect(result.coopHint).toBe("Wind route live");
    expect(result.streams.find((s) => s.id === "relay")?.value).toContain("Open");
    expect(result.streams.find((s) => s.id === "bulletin")?.value).toContain("Flood");
  });

  it("reads local hour in America/Chicago", () => {
    const hour = localHourInTimeZone(new Date("2026-06-07T21:00:00-05:00"), "America/Chicago");
    expect(hour).toBe(21);
  });

  it("uses local-hour slots in dev when season window unset", () => {
    const slot = resolveActiveRouteWindowSlot(
      "node_06",
      new Date("2026-06-07T21:00:00-05:00"),
      {
        window: { starts_at: null, ends_at: null },
        route_window_schedule: SEASON.route_window_schedule,
      }
    );
    expect(slot?.route_open).toBe(true);
  });
});
