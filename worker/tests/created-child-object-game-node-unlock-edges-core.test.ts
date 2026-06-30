import { describe, expect, it } from "vitest";

import {
  buildSeasonMetadataDraftExport,
  normalizeUnlockEdgesDraft,
  resolveUnlockEdgeNodeOptions,
  resolveUnlockEdgesForEditor,
  suggestedSeasonMetadataDraftFilename,
  validateUnlockEdgesDraft,
} from "../../site/js/created-child-object-game-node-unlock-edges-core.mjs";
import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("created-child-object-game-node-unlock-edges-core", () => {
  const exampleSeason = loadSeasonJsonFile(root, "city-game-example-season-01.json");

  it("lists registered template nodes for edge pickers", () => {
    const templateRows = exampleSeason.nodes.slice(0, 3).map((node) => ({
      node_id: node.node_id,
      label: node.label,
      object_id: node.object_id,
    }));
    const registered = [
      {
        object_type: "game_node",
        status: "active",
        qr_id: "qr_a",
        object_id: templateRows[0].object_id,
        public_label: "Lantern",
      },
      {
        object_type: "game_node",
        status: "active",
        qr_id: "qr_b",
        object_id: templateRows[1].object_id,
        public_label: "Arch",
      },
    ];
    const options = resolveUnlockEdgeNodeOptions(registered, templateRows);
    expect(options.map((row) => row.node_id)).toEqual(["node_01", "node_02"]);
  });

  it("validates unlock edges against template node ids", () => {
    const templateRows = exampleSeason.nodes.slice(0, 3).map((node) => ({
      node_id: node.node_id,
      object_id: node.object_id,
    }));
    const good = validateUnlockEdgesDraft(templateRows, [
      { from: "node_01", to: "node_02", label: "opens" },
    ]);
    expect(good.ok).toBe(true);

    const bad = validateUnlockEdgesDraft(templateRows, [{ from: "node_01", to: "node_99" }]);
    expect(bad.ok).toBe(false);
    expect(bad.issues[0]).toMatch(/unknown to/);
  });

  it("prefers draft edges over season JSON for editor seed", () => {
    const edges = resolveUnlockEdgesForEditor(exampleSeason, exampleSeason.season_id, [
      { from: "node_03", to: "node_04", label: "draft only" },
    ]);
    expect(edges[0]).toEqual({ from: "node_03", to: "node_04", label: "draft only" });
  });

  it("exports merged season metadata draft with unlock_edges", () => {
    const draft = {
      status: "planned",
      districts: ["downtown"],
      unlock_edges: [{ from: "node_02", to: "node_03", label: "test edge" }],
    };
    const exported = buildSeasonMetadataDraftExport(
      exampleSeason,
      draft,
      "prof_example_test"
    );
    expect(exported.season_root_profile_id).toBe("prof_example_test");
    expect(exported.status).toBe("planned");
    expect(normalizeUnlockEdgesDraft(exported.unlock_edges)).toEqual([
      { from: "node_02", to: "node_03", label: "test edge" },
    ]);
  });

  it("suggests a safe metadata draft filename", () => {
    expect(suggestedSeasonMetadataDraftFilename("example_city_season_01")).toBe(
      "city-game-example_city_season_01-metadata-draft.json"
    );
  });
});
