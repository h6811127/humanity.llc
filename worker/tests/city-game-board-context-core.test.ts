import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  boardContextMember,
  resolveBoardContextEdges,
  resolveBoardContextFilters,
  resolveBoardContextMembers,
  resolveBoardContextSnapshotRef,
  resolveBoardContextSpine,
  resolveBoardContextView,
} from "../../site/js/city-game-board-context-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game board context view", () => {
  it("resolves Cedar Rapids season as a network context view", () => {
    const context = resolveBoardContextView(season);
    expect(context.context_id).toBe("cr_season_01_wake");
    expect(context.context_kind).toBe("network");
    expect(context.title).toBe("Wake the city");
    expect(context.members.length).toBeGreaterThan(0);
    expect(context.members.every((row) => row.entry_id && row.label && row.category)).toBe(true);
    expect(context.edges.length).toBeGreaterThan(0);
    expect(context.filters.categories.some((chip) => chip.id === "all")).toBe(true);
    expect(context.filters.state_filters).toBe(true);
  });

  it("maps season nodes to neutral members with layout and scan handles", () => {
    const members = resolveBoardContextMembers(season);
    const lantern = members.find((row) => row.entry_id === "node_04");
    expect(lantern).toMatchObject({
      entry_id: "node_04",
      label: "Riverwalk River Lantern",
      category: "temp_drop",
      group: "river_spine",
    });
    expect(lantern?.layout).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    expect(lantern?.scan_url).toBeNull();
  });

  it("reuses comprehension_kit spine for primary and probe entries", () => {
    const spine = resolveBoardContextSpine(season);
    expect(spine.primary_entry_id).toBe("node_04");
    expect(spine.probe_entries.map((row) => row.entry_id)).toEqual([
      "node_04",
      "node_07",
      "node_02",
      "node_14",
    ]);
    expect(spine.probe_entries[0]?.blurb).toContain("GT-1");
    expect(boardContextMember(resolveBoardContextView(season), "node_04")?.label).toContain(
      "River Lantern"
    );
  });

  it("derives filter categories from map_board explore config", () => {
    const filters = resolveBoardContextFilters(season);
    expect(filters.explore_label).toBe("Explore by");
    const relay = filters.categories.find((chip) => chip.id === "relay_gate");
    expect(relay?.label).toBe("Relay");
  });

  it("references season snapshot path without new resolver types", () => {
    const snapshot = resolveBoardContextSnapshotRef(season);
    expect(snapshot.season_id).toBe("cr_season_01_wake");
    expect(snapshot.path).toBe("/.well-known/hc/v1/seasons/cr_season_01_wake/snapshot");
    expect(snapshot.poll_ms).toBeGreaterThan(0);
  });

  it("maps unlock edges to neutral cross-member links", () => {
    const edges = resolveBoardContextEdges(season);
    expect(edges.some((edge) => edge.from_entry_id === "node_04")).toBe(true);
    expect(edges.every((edge) => edge.from_entry_id && edge.to_entry_id)).toBe(true);
  });
});
