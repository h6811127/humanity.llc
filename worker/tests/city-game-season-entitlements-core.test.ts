import { describe, expect, it } from "vitest";
import {
  gameSeasonBlockFromEntitlementsResponse,
  gameSeasonMeterRemaining,
  gameSeasonMeterUsage,
  gameSeasonUsageAtLimit,
} from "../../site/js/city-game-season-entitlements-core.mjs";

describe("gameSeasonBlockFromEntitlementsResponse", () => {
  it("parses usage block", () => {
    const block = gameSeasonBlockFromEntitlementsResponse({
      game_season: {
        season_id: "cr_season_01_wake",
        enabled: true,
        limits: { "game.season.node_cap": 15 },
        usage: {
          counters: { "game.contribute": 3 },
          limits: { "game.contribute": 25000 },
        },
      },
    });
    expect(block?.seasonId).toBe("cr_season_01_wake");
    expect(block?.limits["game.season.node_cap"]).toBe(15);
  });

  it("ignores multi-season hint shape", () => {
    expect(
      gameSeasonBlockFromEntitlementsResponse({
        game_season: { season_ids: ["a", "b"], hint: "Pass ?season_id=" },
      })
    ).toBeNull();
  });
});

describe("gameSeasonMeterRemaining", () => {
  it("subtracts used from cap", () => {
    expect(
      gameSeasonMeterRemaining(
        { counters: { "game.contribute": 100 }, limits: { "game.contribute": 25000 } },
        "game.contribute"
      )
    ).toBe(24900);
  });
});

describe("gameSeasonMeterUsage", () => {
  it("detects at limit", () => {
    const row = gameSeasonMeterUsage(
      { counters: { "game.contribute": 25000 }, limits: { "game.contribute": 25000 } },
      "game.contribute"
    );
    expect(row?.remaining).toBe(0);
    expect(gameSeasonUsageAtLimit(row!.used, row!.limit)).toBe(true);
  });
});
