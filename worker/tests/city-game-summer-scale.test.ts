import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PILOT_SEASON_NODE_COUNT,
  SUMMER_OPEN_NODE_COUNT,
  SUMMER_WAVE_OPEN_NODE_COUNT,
  validatePilotFootprint,
  validateSummerWaveOpenFootprint,
} from "../scripts/city-game-summer-scale-core.mjs";
import {
  CR_SEASON_PATH,
  CR_WAVE_OPEN_PATH,
  mergeWaveOpenIntoSeason,
} from "../scripts/merge-city-game-wave-open.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(readFileSync(CR_SEASON_PATH, "utf8"));
const wave = JSON.parse(readFileSync(CR_WAVE_OPEN_PATH, "utf8"));
const spineSeason = {
  ...season,
  nodes: season.nodes.filter((n: { node_id: string }) => {
    const num = Number(String(n.node_id).replace("node_", ""));
    return num >= 1 && num <= PILOT_SEASON_NODE_COUNT;
  }),
  automation: {
    ...season.automation,
    relay_capture_nodes: (season.automation?.relay_capture_nodes ?? []).filter(
      (id: string) => Number(String(id).replace("node_", "")) <= PILOT_SEASON_NODE_COUNT
    ),
  },
};
const waveOpenSeason = mergeWaveOpenIntoSeason(spineSeason, wave);

describe("WS-SCALE SC-1 summer-open footprint", () => {
  it("validates 15-node pilot spine slice", () => {
    const result = validatePilotFootprint(spineSeason);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.nodeCount).toBe(PILOT_SEASON_NODE_COUNT);
    expect(result.summary.classCounts).toMatchObject({
      spine: 15,
    });
  });

  it("validates 40-node footprint after wave-open merge from spine", () => {
    const result = validateSummerWaveOpenFootprint(waveOpenSeason);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.nodeCount).toBe(SUMMER_WAVE_OPEN_NODE_COUNT);
  });

  it("requires full map_layout coverage", () => {
    const ids = season.nodes.map((n: { node_id: string }) => n.node_id);
    for (const id of ids) {
      expect(season.map_layout.nodes[id]).toBeTruthy();
    }
  });
});
