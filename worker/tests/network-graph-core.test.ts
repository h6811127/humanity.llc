import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  contributableNodeIds,
  contributeModeForNode,
  validateNetworkGraph,
} from "../scripts/network-graph-core.mjs";
import {
  networkGraphFromConfig,
  validateNetworkGraph as validateNetworkGraphTs,
} from "../src/live-object/network-graph";

const crSeason = JSON.parse(
  readFileSync(join(process.cwd(), "site/data/city-game-cr-season-01.json"), "utf8")
);

const graphConfig = {
  nodes: crSeason.nodes,
  unlock_edges: crSeason.unlock_edges,
  automation: crSeason.automation,
};

describe("network-graph-core.mjs (script + worker shared)", () => {
  it("validates Cedar Rapids season graph", () => {
    const result = validateNetworkGraph(graphConfig);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("lists contributable nodes from automation thresholds", () => {
    expect(contributableNodeIds(graphConfig)).toEqual([
      "node_01",
      "node_04",
      "node_09",
      "node_10",
      "node_11",
    ]);
    expect(contributeModeForNode(graphConfig, "node_04")).toBe("quorum");
    expect(contributeModeForNode(graphConfig, "node_10")).toBe("scarcity");
  });

  it("matches TypeScript network-graph wrapper for the same season JSON", () => {
    const graph = networkGraphFromConfig(graphConfig);
    expect(validateNetworkGraphTs(graphConfig)).toEqual(validateNetworkGraph(graphConfig));
    expect(graph.contributableNodeIds()).toEqual(contributableNodeIds(graphConfig));
    expect(graph.contributeModeForNode("node_09")).toBe(
      contributeModeForNode(graphConfig, "node_09")
    );
  });

  it("rejects unknown unlock edge targets", () => {
    const result = validateNetworkGraph({
      nodes: graphConfig.nodes.slice(0, 1),
      unlock_edges: [{ from: "node_01", to: "node_99", label: "missing" }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("node_99"))).toBe(true);
  });
});
