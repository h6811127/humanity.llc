import { describe, expect, it } from "vitest";

import { resolveStreamPolicy, isCareStreamPaused } from "../src/live-object/stream-policy";
import type { GameNodeScanContext } from "../src/city-game/scan-view";

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
        ],
      },
    ],
  },
  route_window_schedule: { entries: [] },
};

function relayGameNode(overrides: Partial<GameNodeScanContext> = {}): GameNodeScanContext {
  return {
    enabled: true,
    mode: "game",
    seasonId: "cr_season_01_wake",
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

describe("resolveStreamPolicy (Order 4 — stream precedence)", () => {
  it("detects care stream maintenance pause", () => {
    expect(
      isCareStreamPaused([
        { id: "care", class: "care", label: "Site", value: "Closed for maintenance" },
      ])
    ).toBe(true);
  });

  it("mutes game bulletin overlays when care stream is paused", () => {
    const streams = [
      { id: "care", class: "care", label: "Site", value: "Closed for maintenance" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored bulletin" },
    ];
    const result = resolveStreamPolicy({
      streams,
      now: new Date("2026-06-07T12:00:00-05:00"),
      season: SEASON,
      nodeId: "node_01",
      gameNode: relayGameNode({ mode: "care_pause" }),
    });

    expect(result.phase).toBe("care_pause");
    expect(result.carePaused).toBe(true);
    expect(result.gameOverlaysApplied).toBe(false);
    expect(result.streams.find((s) => s.id === "bulletin")?.value).toBe("Stored bulletin");
  });

  it("applies bulletin schedule when game is live and care is clear", () => {
    const streams = [
      { id: "care", class: "care", label: "Site", value: "Clear" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Awaiting season open" },
      { id: "relay", class: "route", label: "Relay status", value: "Closed" },
    ];
    const result = resolveStreamPolicy({
      streams,
      now: new Date("2026-06-06T19:00:00-05:00"),
      season: SEASON,
      nodeId: "node_01",
      gameNode: relayGameNode(),
    });

    expect(result.phase).toBe("game_scheduled");
    expect(result.gameOverlaysApplied).toBe(true);
    expect(result.streams.find((s) => s.id === "bulletin")?.value).toBe(
      "Shift west, mural alley stays safe"
    );
  });

  it("skips game overlays when node is dormant", () => {
    const streams = [
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored" },
    ];
    const result = resolveStreamPolicy({
      streams,
      now: new Date("2026-06-05T12:00:00-05:00"),
      season: SEASON,
      nodeId: "node_01",
      gameNode: relayGameNode({ mode: "dormant", seasonWindowPhase: "before" }),
    });

    expect(result.phase).toBe("game_muted");
    expect(result.gameOverlaysApplied).toBe(false);
    expect(result.streams[0].value).toBe("Stored");
  });
});
