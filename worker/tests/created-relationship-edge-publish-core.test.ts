import { describe, expect, it } from "vitest";

import {
  buildRelationshipEdgeUnsignedFromUnlockDraft,
  buildRelationshipEdgesFromUnlockDraft,
  assessScanGraphPublish,
  filterUnlockEdgesForScanGraphPublish,
  relationshipEdgeIdFromDraft,
  resolveRelationshipEdgeKind,
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
  RELATIONSHIP_EDGE_KIND_WITNESSES,
} from "../../site/js/created-relationship-edge-publish-core.mjs";
import { resolveSeasonTemplateRows } from "../../site/js/city-game-season-template-core.mjs";
import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("created-relationship-edge-publish-core", () => {
  const crSeason = loadSeasonJsonFile(root, "city-game-cr-season-01.json");
  const templateRows = resolveSeasonTemplateRows(crSeason, crSeason.season_id);

  it("classifies witness vs unlock kinds from template role / label", () => {
    expect(resolveRelationshipEdgeKind(templateRows, "node_10", { label: "" })).toBe(
      RELATIONSHIP_EDGE_KIND_WITNESSES
    );
    expect(
      resolveRelationshipEdgeKind(templateRows, "node_04", {
        label: "River Lantern unlocks Czech Village cabinet",
      })
    ).toBe(RELATIONSHIP_EDGE_KIND_UNLOCKS);
  });

  it("builds stable edge ids from season + path", () => {
    const id = relationshipEdgeIdFromDraft(
      "cr_season_01_wake",
      "node_04",
      "node_07",
      RELATIONSHIP_EDGE_KIND_UNLOCKS
    );
    expect(id).toBe("edge_cr_unlock_04_07");
  });

  it("maps unlock_edges draft to unsigned relationship_edge documents", () => {
    const result = buildRelationshipEdgeUnsignedFromUnlockDraft({
      profileId: "prof_test",
      seasonId: crSeason.season_id,
      templateRows,
      edge: {
        from: "node_04",
        to: "node_07",
        label: "River Lantern unlocks Czech Village cabinet",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unsigned.kind).toBe(RELATIONSHIP_EDGE_KIND_UNLOCKS);
    expect(result.unsigned.from).toEqual({ ref: "object_id", id: "obj_cr_node_04_river" });
    expect(result.unsigned.to).toEqual({ ref: "object_id", id: "obj_cr_node_07_cabinet" });
    expect(result.unsigned.unlock).toEqual({ from_node_id: "node_04", to_node_id: "node_07" });
  });

  it("builds witness edge for library → cabinet row", () => {
    const built = buildRelationshipEdgesFromUnlockDraft({
      profileId: "prof_test",
      seasonId: crSeason.season_id,
      templateRows,
      unlockEdges: [
        {
          from: "node_10",
          to: "node_07",
          label: "Library witness vouch opens cabinet path",
        },
      ],
    });
    expect(built.edges).toHaveLength(1);
    expect(built.edges[0]?.kind).toBe(RELATIONSHIP_EDGE_KIND_WITNESSES);
    expect(built.edges[0]?.unsigned.witness).toEqual({
      from_node_id: "node_10",
      to_node_id: "node_07",
    });
  });

  it("scopes scan graph publish to witness + quorum paths (not fragment lattice)", () => {
    const scoped = filterUnlockEdgesForScanGraphPublish(
      crSeason,
      crSeason.unlock_edges,
      templateRows
    );
    expect(scoped).toHaveLength(2);
    expect(scoped.map((row) => row.from)).toEqual(["node_04", "node_10"]);
  });

  it("assessScanGraphPublish detects missing live edges", () => {
    const edges = [
      { from: "node_04", to: "node_07", label: "River Lantern unlocks Czech Village cabinet" },
    ];
    const assess = assessScanGraphPublish({
      profileId: "prof_test",
      seasonId: crSeason.season_id,
      templateRows,
      unlockEdges: edges,
      liveEdges: [],
      season: crSeason,
    });
    expect(assess.ready).toBe(false);
    expect(assess.missingEdgeIds.length).toBe(1);
  });

  it("assessScanGraphPublish passes when cabinet dual-gate edges are live", () => {
    const live = [
      { edge_id: "edge_cr_witness_10_07", status: "active" },
      { edge_id: "edge_cr_unlock_04_07", status: "active" },
    ];
    const assess = assessScanGraphPublish({
      profileId: "prof_test",
      seasonId: crSeason.season_id,
      templateRows,
      unlockEdges: crSeason.unlock_edges,
      liveEdges: live,
      season: crSeason,
    });
    expect(assess.ready).toBe(true);
    expect(assess.expectedEdgeIds).toHaveLength(2);
  });
});
