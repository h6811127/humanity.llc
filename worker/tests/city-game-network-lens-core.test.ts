import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  derivePlaySpineNodeIds,
  isNetworkLensSpineNode,
  networkLensNextNodeId,
  resolveNetworkLens,
  resolveNetworkLensCopy,
  validateNetworkLens,
} from "../../site/js/city-game-network-lens-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-network-lens-core", () => {
  it("reads network_lens from Cedar Rapids season JSON", () => {
    const lens = resolveNetworkLens(season);
    expect(lens.configured).toBe(true);
    expect(lens.play_spine).toEqual(["node_04", "node_07", "node_09", "node_11", "node_13"]);
    expect(lens.default_list).toBe("spine");
    expect(lens.next_node_id).toBe("node_04");
  });

  it("resolves network lens copy from season JSON", () => {
    const lens = resolveNetworkLens(season);
    expect(lens.copy.start_callout_kicker).toBe("Suggested first stop");
    expect(lens.copy.start_callout_title_prefix).toBe("Try here");
    expect(lens.copy.legend_title).toBe("Key route stops");
  });

  it("resolveNetworkLensCopy falls back to defaults", () => {
    const { network_lens: _removed, ...bare } = season;
    const copy = resolveNetworkLensCopy(bare);
    expect(copy.start_callout_kicker).toBe("Suggested first stop");
    expect(copy.drawer_summary).toBe("Routes and connections");
  });

  it("derives spine when network_lens block is absent", () => {
    const { network_lens: _removed, ...bare } = season;
    const lens = resolveNetworkLens(bare);
    expect(lens.play_spine).toContain("node_04");
    expect(lens.play_spine).toContain("node_13");
    expect(lens.next_node_id).toBe("node_04");
  });

  it("flags spine membership", () => {
    expect(isNetworkLensSpineNode(season, "node_04")).toBe(true);
    expect(isNetworkLensSpineNode(season, "node_02")).toBe(false);
  });

  it("validateNetworkLens passes for current season", () => {
    expect(validateNetworkLens(season)).toEqual([]);
  });

  it("validateNetworkLens rejects unknown spine and next-node references", () => {
    const invalid = {
      ...season,
      network_lens: {
        ...season.network_lens,
        play_spine: ["node_04", "node_missing"],
        next_node_id: "node_missing_next",
      },
    };

    expect(validateNetworkLens(invalid)).toEqual([
      "network_lens.play_spine references unknown node_id node_missing.",
      "network_lens.next_node_id references unknown node_id node_missing_next.",
      "network_lens.next_node_id (node_missing_next) should appear in play_spine for GT-8 orientation.",
    ]);
  });

  it("validateNetworkLens requires the next node to stay on the play spine", () => {
    const offSpineNode = season.nodes.find(
      (row: { node_id: string }) => row.node_id && !season.network_lens.play_spine.includes(row.node_id)
    )?.node_id;
    expect(offSpineNode).toBeTruthy();

    const invalid = {
      ...season,
      network_lens: {
        ...season.network_lens,
        next_node_id: offSpineNode,
      },
    };

    expect(validateNetworkLens(invalid)).toContain(
      `network_lens.next_node_id (${offSpineNode}) should appear in play_spine for GT-8 orientation.`
    );
  });

  it("derivePlaySpineNodeIds respects registry node set", () => {
    const mini = {
      ...season,
      nodes: season.nodes.filter((row: { node_id: string }) =>
        ["node_04", "node_07"].includes(row.node_id)
      ),
    };
    delete mini.network_lens;
    expect(derivePlaySpineNodeIds(mini)).toEqual(["node_04", "node_07"]);
    expect(networkLensNextNodeId(mini)).toBe("node_04");
  });
});
