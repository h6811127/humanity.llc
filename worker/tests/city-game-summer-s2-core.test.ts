import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildGameNodeMintTemplate } from "../scripts/city-game-node-defaults.mjs";
import {
  SUMMER_S2_ARTIFACT_BY_NODE,
  SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE,
  seasonWithSummerS2Nodes,
  validateSeasonSummerS2,
} from "../scripts/city-game-summer-s2-core.mjs";
import { applyRelayCaptureLocally } from "../src/city-game/relay-contribute";
import { normalizeGameMeta } from "../src/city-game/game-meta";
import { gameNodeCoopHint } from "../src/city-game/scan-view";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const seasonS2 = seasonWithSummerS2Nodes(season);

describe("city-game-summer-s2-core (SW-09 / SW-12)", () => {
  it("season JSON declares summer_s2 artifact + overharvest nodes", () => {
    const result = validateSeasonSummerS2(seasonS2);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("mint templates carry artifact and overharvest game_meta", () => {
    const row21 = seasonS2.nodes.find((n: { node_id: string }) => n.node_id === "node_21");
    const row22 = seasonS2.nodes.find((n: { node_id: string }) => n.node_id === "node_22");
    const row15 = seasonS2.nodes.find((n: { node_id: string }) => n.node_id === "node_15");
    const row31 = seasonS2.nodes.find((n: { node_id: string }) => n.node_id === "node_31");

    const t21 = buildGameNodeMintTemplate(row21, season.season_id);
    const t22 = buildGameNodeMintTemplate(row22, season.season_id);
    const t15 = buildGameNodeMintTemplate(row15, season.season_id);
    const t31 = buildGameNodeMintTemplate(row31, season.season_id);

    expect(t21.game_meta.artifact_id).toBe(SUMMER_S2_ARTIFACT_BY_NODE.node_21);
    expect(t22.game_meta.artifact_id).toBe(SUMMER_S2_ARTIFACT_BY_NODE.node_22);
    expect(t15.game_meta.overharvest_limit).toBe(
      SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE.node_15
    );
    expect(t31.game_meta.overharvest_limit).toBe(
      SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE.node_31
    );
  });

  it("overharvest capture compromises hot relay at limit", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const doc = {
      public_state: "Hot relay",
      object_streams: [
        { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
        { id: "relay", class: "route", label: "Relay status", value: "Open" },
        { id: "bulletin", class: "narrative", label: "Warning", value: "Watch commons" },
        { id: "care", class: "care", label: "Site", value: "Clear" },
      ],
      game_meta: normalizeGameMeta({
        overharvest_limit: 18,
        overharvest_count: 17,
      }),
    };
    const result = applyRelayCaptureLocally(doc, {
      faction: "red",
      now,
      decayHours: 24,
      action: "capture",
    });
    expect(result.meta.compromised).toBe(true);
    expect(result.overharvestTriggered).toBe(true);
    expect(result.doc.public_state).toContain("holds the relay");
  });

  it("scan coop hints mention artifact and commons pressure", () => {
    expect(
      gameNodeCoopHint(
        "relay_gate",
        normalizeGameMeta({ artifact_id: "hidden_relay" })
      )
    ).toMatch(/hidden relay/i);
    expect(
      gameNodeCoopHint(
        "relay_gate",
        normalizeGameMeta({
          overharvest_limit: 18,
          overharvest_count: 14,
        })
      )
    ).toContain("Commons pressure");
  });
});
