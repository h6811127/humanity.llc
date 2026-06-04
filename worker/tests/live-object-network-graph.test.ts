import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CR_SEASON_01 } from "../src/city-game/season-config";
import {
  NetworkGraph,
  isUnlockEdgeSatisfied,
  networkGraphFromConfig,
  publicUnlockEdges,
  validateNetworkGraph,
} from "../src/live-object/network-graph";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonJson = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("NetworkGraph (Order 5 — network grammar)", () => {
  it("validates Cedar Rapids season graph structure", () => {
    const result = validateNetworkGraph({
      nodes: seasonJson.nodes,
      unlock_edges: seasonJson.unlock_edges,
      automation: seasonJson.automation,
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("indexes object_id ↔ node_id for all season nodes", () => {
    const graph = networkGraphFromConfig(CR_SEASON_01);
    expect(CR_SEASON_01.nodes.length).toBeGreaterThan(0);
    for (const node of CR_SEASON_01.nodes) {
      expect(graph.nodeIdForObject(node.object_id)).toBe(node.node_id);
      expect(graph.objectIdForNode(node.node_id)).toBe(node.object_id);
    }
  });

  it("exposes automation thresholds without Cedar Rapids hardcoding in callers", () => {
    const graph = networkGraphFromConfig(CR_SEASON_01);
    expect(graph.quorumNodeIds()).toContain("node_04");
    expect(graph.fragmentNodeIds()).toEqual(
      expect.arrayContaining(["node_09", "node_11", "node_01"])
    );
    expect(graph.finaleNodeId()).toBe("node_13");
    expect(graph.contributableNodeIds()).toContain("node_10");
    expect(graph.contributeModeForNode("node_04")).toBe("quorum");
    expect(graph.contributeModeForNode("node_09")).toBe("fragment");
    expect(graph.contributeModeForNode("node_10")).toBe("scarcity");
  });

  it("maps unlock edges from quorum node to cabinet", () => {
    const graph = networkGraphFromConfig(CR_SEASON_01);
    const edges = graph.unlockEdgesFrom("node_04");
    expect(edges.some((e) => e.to === "node_07")).toBe(true);
    expect(graph.vouchTargetsFrom("node_04")).toContain("node_07");
  });

  it("evaluates public unlock edge satisfaction from unlocked_by lists", () => {
    expect(isUnlockEdgeSatisfied(["node_04"], "node_04")).toBe(true);
    expect(isUnlockEdgeSatisfied([], "node_04")).toBe(false);

    const rows = publicUnlockEdges(
      [{ from: "node_04", to: "node_07", label: "River Lantern unlocks cabinet" }],
      (nodeId) => (nodeId === "node_07" ? ["node_04"] : [])
    );
    expect(rows[0].satisfied).toBe(true);
  });

  it("rejects graphs with edges pointing at unknown nodes", () => {
    const graph = new NetworkGraph({
      nodes: [
        {
          node_id: "node_01",
          object_id: "obj_a",
          role: "relay_gate",
          district: "downtown",
          label: "A",
        },
      ],
      unlock_edges: [{ from: "node_01", to: "node_99", label: "missing target" }],
    });
    const validation = validateNetworkGraph(graph.config);
    expect(validation.ok).toBe(false);
    expect(validation.issues.some((i) => i.includes("node_99"))).toBe(true);
  });
});
