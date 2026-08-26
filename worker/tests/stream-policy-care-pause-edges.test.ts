import { describe, expect, it } from "vitest";

import type { GameNodeScanContext } from "../src/city-game/scan-view";
import {
  isCareStreamPaused,
  resolveStreamPolicy,
} from "../src/live-object/stream-policy";
import type { ObjectPublicStream } from "../src/validation/object-streams";

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
            bulletin: "Shift west",
          },
        ],
      },
    ],
  },
  route_window_schedule: { entries: [] },
};

function care(value: string, extras: Partial<ObjectPublicStream> = {}): ObjectPublicStream {
  return { id: "care", class: "care", label: "Site", value, ...extras };
}

function gameNode(overrides: Partial<GameNodeScanContext> = {}): GameNodeScanContext {
  return {
    enabled: true,
    mode: "game",
    seasonId: "cr_season_01_wake",
    nodeId: "node_01",
    nodeRole: "relay_gate",
    district: "newbo",
    gameMeta: {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: [],
      vouch_active_for: [],
      scarcity_remaining: null,
      fragment_id: null,
      held_by_faction: null,
      held_until: null,
      points_per_hour: null,
      artifact_id: null,
      evolution_week: null,
      overharvest_count: null,
      overharvest_limit: null,
    },
    coopHint: null,
    showsPledge: false,
    pledgeFaction: null,
    roleEyebrow: "NewBo · Relay · gate",
    showsContribute: false,
    contributeMode: null,
    contributeSiteCodePlaceholder: null,
    vouchGate: null,
    seasonWindowPhase: "open",
    ...overrides,
  };
}

describe("isCareStreamPaused token edges", () => {
  it("matches every care-pause token case-insensitively", () => {
    for (const value of [
      "Pause until noon",
      "CLOSED",
      "Under maintenance",
      "Flood stage",
      "Blocked alley",
      "Out of service tonight",
    ]) {
      expect(isCareStreamPaused([care(value)]), value).toBe(true);
    }
  });

  it("does not pause on clear, empty, or missing care streams", () => {
    expect(isCareStreamPaused([care("Clear")])).toBe(false);
    expect(isCareStreamPaused([care("Open · 18 min")])).toBe(false);
    expect(isCareStreamPaused([care("")])).toBe(false);
    expect(isCareStreamPaused([{ id: "bulletin", class: "narrative", label: "Note", value: "paused" }])).toBe(
      false
    );
    expect(isCareStreamPaused([])).toBe(false);
  });

  it("treats class=care or id=care as the care stream", () => {
    expect(
      isCareStreamPaused([{ id: "site", class: "care", label: "Site", value: "blocked" }])
    ).toBe(true);
    expect(
      isCareStreamPaused([{ id: "care", class: "narrative", label: "Care", value: "flood" }])
    ).toBe(true);
  });
});

describe("resolveStreamPolicy care-pause precedence", () => {
  it("mutes scheduled game overlays when care matches a pause token", () => {
    const streams: ObjectPublicStream[] = [
      care("Flood warning"),
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored bulletin" },
    ];
    const result = resolveStreamPolicy({
      streams,
      now: new Date("2026-06-07T12:00:00-05:00"),
      season: SEASON,
      nodeId: "node_01",
      gameNode: gameNode(),
    });
    expect(result.phase).toBe("care_pause");
    expect(result.carePaused).toBe(true);
    expect(result.gameOverlaysApplied).toBe(false);
    expect(result.streams.find((row) => row.id === "bulletin")?.value).toBe(
      "Stored bulletin"
    );
  });
});
