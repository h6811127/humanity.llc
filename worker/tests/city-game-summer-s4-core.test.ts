import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  mergeSummerS4,
  SUMMER_S4_DUAL_VICTORY_DISPLAY,
  validateSeasonSummerS4,
} from "../scripts/city-game-summer-s4-core.mjs";
import {
  buildDualVictoryPanelHtml,
  shouldShowDualVictoryPanel,
} from "../../site/js/city-game-dual-victory-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const seasonS4 = mergeSummerS4(season);

describe("city-game-summer-s4-core (SW-13)", () => {
  it("validates dual_victory display canon in season JSON", () => {
    const result = validateSeasonSummerS4(seasonS4);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("builds snapshot paths for board panel", () => {
    const dual = {
      ...SUMMER_S4_DUAL_VICTORY_DISPLAY,
      paths: [
        {
          id: "network",
          title: SUMMER_S4_DUAL_VICTORY_DISPLAY.network_title,
          detail: "Red holds 2 of 4 relays.",
          status: "in_progress",
        },
        {
          id: "awakening",
          title: SUMMER_S4_DUAL_VICTORY_DISPLAY.awakening_title,
          detail: "2 / 3 fragments.",
          status: "in_progress",
        },
      ],
    };
    const html = buildDualVictoryPanelHtml(dual);
    expect(html).toContain('id="city-game-map-dual-victory"');
    expect(html).toContain("Signal War · relay majority");
    expect(html).toContain("Wake the city · cooperative awakening");
  });

  it("shows panel when snapshot includes dual_victory paths", () => {
    const snapshot = {
      signal_war: {
        dual_victory: {
          ...SUMMER_S4_DUAL_VICTORY_DISPLAY,
          paths: [
            {
              id: "network",
              title: SUMMER_S4_DUAL_VICTORY_DISPLAY.network_title,
              detail: "In progress",
              status: "in_progress",
            },
          ],
        },
      },
    };
    expect(shouldShowDualVictoryPanel(snapshot)).toBe(true);
  });
});
