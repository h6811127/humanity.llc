import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { gameNodeContributeMode } from "../src/city-game/unlock-engine";
import {
  CR_SEASON_01,
  seasonRelayCapturePlayerEnabled,
} from "../src/city-game/season-config";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonJson = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("Signal War SW-S1", () => {
  it("disables player relay capture in bundled season until S2", () => {
    expect(seasonJson.automation?.relay_capture_player_enabled).toBe(false);
    expect(seasonRelayCapturePlayerEnabled(CR_SEASON_01)).toBe(false);
    expect(
      gameNodeContributeMode("node_05", { compromised: false } as never, "relay_gate")
    ).toBe(null);
  });

  it("allows relay capture when env override is set (S2 dev)", () => {
    expect(
      gameNodeContributeMode(
        "node_05",
        { compromised: false } as never,
        "relay_gate",
        CR_SEASON_01,
        { CITY_GAME_RELAY_CAPTURE_PLAYER: "1" }
      )
    ).toBe("capture");
  });
});
