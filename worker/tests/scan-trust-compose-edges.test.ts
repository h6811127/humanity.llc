import { describe, expect, it } from "vitest";

import { normalizeGameMeta } from "../src/city-game/game-meta";
import type { GameNodeScanContext } from "../src/city-game/scan-view";
import { defaultSeason } from "../src/city-game/season-loader";
import { composeScanTrustContext } from "../src/resolver/scan-trust-compose";

function gameNode(
  overrides: Partial<GameNodeScanContext> = {}
): GameNodeScanContext {
  return {
    enabled: true,
    mode: "game",
    seasonId: "cr_season_01_wake",
    nodeId: "node_04",
    nodeRole: "temp_drop",
    district: "river_spine",
    gameMeta: normalizeGameMeta({
      collective_progress: 8,
      collective_target: 20,
    }),
    coopHint: null,
    showsPledge: false,
    pledgeFaction: null,
    roleEyebrow: "River spine · Temp drop",
    showsContribute: true,
    contributeMode: "collective",
    contributeSiteCodePlaceholder: "RIVER-04",
    vouchGate: null,
    seasonWindowPhase: "open",
    ...overrides,
  };
}

describe("composeScanTrustContext edges", () => {
  it("returns null without a season-bound game node", () => {
    const season = defaultSeason();
    expect(
      composeScanTrustContext({
        gameNode: null,
        childObjectType: "game_node",
        objectStreams: [],
        season,
      })
    ).toBeNull();

    expect(
      composeScanTrustContext({
        gameNode: gameNode({ seasonId: null as unknown as string }),
        childObjectType: "game_node",
        objectStreams: [],
        season,
      })
    ).toBeNull();
  });

  it("returns null for non-network objects that are not enabled", () => {
    const season = defaultSeason();
    expect(
      composeScanTrustContext({
        gameNode: gameNode({ enabled: false }),
        childObjectType: "status_plate",
        objectStreams: [],
        season,
      })
    ).toBeNull();
  });

  it("keeps Care signers and care-pause prove line during care_pause", () => {
    const season = defaultSeason();
    const trust = composeScanTrustContext({
      gameNode: gameNode({ mode: "care_pause" }),
      childObjectType: "game_node",
      objectStreams: [
        { id: "bulletin", class: "narrative", label: "Bulletin", value: "Share outward" },
        { id: "care", class: "care", label: "Site", value: "Maintenance" },
      ],
      season,
      streamPolicyPhase: "care_pause",
    });

    expect(trust).not.toBeNull();
    expect(trust!.signedBy.some((row) => row.stream === "Care")).toBe(true);
    expect(trust!.signedBy.some((row) => row.stream === "Game")).toBe(true);
    expect(
      trust!.proves.some((line) => line.includes("Care stream wins"))
    ).toBe(true);
    expect(
      trust!.proves.some((line) => line.includes("Signed game bulletins"))
    ).toBe(false);
  });

  it("adds witness-path disclaimer when vouchGate has pending seals", () => {
    const season = defaultSeason();
    const trust = composeScanTrustContext({
      gameNode: gameNode({
        vouchGate: {
          pending: ["node_10"],
          satisfied: [],
          required: ["node_10"],
          met: false,
        },
      }),
      childObjectType: "game_node",
      objectStreams: [],
      season,
    });

    expect(trust).not.toBeNull();
    expect(
      trust!.doesNotProve.some((line) =>
        line.includes("not Steward human vouch")
      )
    ).toBe(true);
  });

  it("omits collective progress prove line when counters are absent", () => {
    const season = defaultSeason();
    const trust = composeScanTrustContext({
      gameNode: gameNode({ gameMeta: normalizeGameMeta({}) }),
      childObjectType: "game_node",
      objectStreams: [],
      season,
    });
    expect(trust).not.toBeNull();
    expect(
      trust!.proves.some((line) => line.includes("Collective progress"))
    ).toBe(false);
  });
});
