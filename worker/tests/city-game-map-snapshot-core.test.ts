import { describe, expect, it } from "vitest";

import {
  buildNodeChipsHtml,
  formatFinaleFootnote,
  formatSyncLabel,
} from "../../site/js/city-game-map-snapshot-core.mjs";
import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";

describe("city-game map snapshot core", () => {
  it("builds chip html without player-tracking vocabulary", () => {
    const html = buildNodeChipsHtml([
      { kind: "collective", label: "City progress", value: "14 / 20" },
    ]);
    expect(html).toContain("14 / 20");
    expect(html.toLowerCase()).not.toMatch(/leaderboard|your progress|heatmap/i);
  });

  it("board shell includes snapshot sync hook and edge data attributes", () => {
    const html = buildMapBoardInnerHtml({
      season_id: "cr_season_01_wake",
      city: "Cedar Rapids, Iowa",
      districts: ["river_spine"],
      nodes: [
        {
          node_id: "node_04",
          object_id: "obj_cr_node_04_river",
          role: "temp_drop",
          district: "river_spine",
          label: "Riverwalk River Lantern",
        },
      ],
      unlock_edges: [
        { from: "node_04", to: "node_07", label: "River Lantern unlocks Czech Village cabinet" },
      ],
      map_layout: {
        version: 1,
        nodes: { node_04: { x: 0.5, y: 0.6 } },
      },
      automation: { quorum_nodes: ["node_04"], finale_node: "node_13", fragment_nodes: [] },
    });
    expect(html).toContain('id="city-game-map-sync"');
    expect(html).toContain('data-edge-from="node_04"');
    expect(html).toContain('data-node-id="node_04"');
    expect(html).toContain("city-game-map-node-live");
    expect(html).toContain("Open in Maps");
  });

  it("formats sync label from snapshot timestamp", () => {
    expect(formatSyncLabel("2026-06-07T18:00:00.000Z")).toContain("City board synced");
  });

  it("formats finale lattice footnote from snapshot", () => {
    const line = formatFinaleFootnote({
      node_id: "node_13",
      open: true,
      fragments: { claimed: 3, required: 3, complete: true },
    });
    expect(line).toContain("3 / 3");
    expect(line).toContain("lattice complete");
    expect(line).toContain("alley arch live");
  });
});
