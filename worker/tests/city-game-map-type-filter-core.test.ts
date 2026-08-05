import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildTypeFilterOptions,
  countHiddenTypeNodes,
  countNodesByRole,
  matchesBoardTypeFilters,
  matchesTypeFilter,
} from "../../site/js/city-game-map-type-filter-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-map-type-filter-core", () => {
  it("counts hidden relays only in signal_war fog when not rumored", () => {
    expect(season.signal_war?.map_visibility).toBe("signal_war");
    const hidden = countHiddenTypeNodes(season);
    expect(hidden).toBeGreaterThan(0);

    const rumored = new Set(
      (season.signal_war?.rumored_node_ids ?? []).map((id: string) => String(id))
    );
    const expected = season.nodes.filter(
      (row: { role?: string; node_id?: string }) =>
        row.role === "relay_gate" && !rumored.has(String(row.node_id ?? ""))
    ).length;
    expect(hidden).toBe(expected);

    expect(countHiddenTypeNodes({ ...season, signal_war: { map_visibility: "public" } })).toBe(
      0
    );
    expect(countHiddenTypeNodes({ nodes: season.nodes })).toBe(0);
  });

  it("includes Hidden chip counts and aggregates lore roles", () => {
    const options = buildTypeFilterOptions(season);
    const hidden = options.find((chip) => chip.id === "hidden");
    expect(hidden?.count).toBe(countHiddenTypeNodes(season));

    const lore = options.find((chip) => chip.id === "lore");
    const roleCounts = countNodesByRole(season);
    const loreExpected =
      (roleCounts.get("lore_archive") ?? 0) +
      (roleCounts.get("temp_drop") ?? 0) +
      (roleCounts.get("mobile_lore") ?? 0) +
      (roleCounts.get("route_splitter") ?? 0);
    expect(lore?.count).toBe(loreExpected);

    const empty = buildTypeFilterOptions({ nodes: [] });
    expect(empty.map((chip) => chip.id)).toEqual(["all", "hidden"]);
  });

  it("matches role groups, hidden visibility, and unknown filter fallbacks", () => {
    expect(matchesTypeFilter("temp_drop", "public", "lore")).toBe(true);
    expect(matchesTypeFilter("route_splitter", "public", "lore")).toBe(true);
    expect(matchesTypeFilter("witness", "public", "lore")).toBe(false);
    expect(matchesTypeFilter("relay_gate", "hidden", "hidden")).toBe(true);
    expect(matchesTypeFilter("relay_gate", "public", "hidden")).toBe(false);
    expect(matchesTypeFilter("relay_gate", "public", "not_a_chip")).toBe(true);
    expect(matchesTypeFilter("relay_gate", "public", "all")).toBe(true);
    expect(matchesTypeFilter("relay_gate", "public", null)).toBe(true);

    expect(
      matchesBoardTypeFilters(
        { role: "temp_drop", boardVisibility: "public" },
        { activeType: "lore" }
      )
    ).toBe(true);
    expect(
      matchesBoardTypeFilters(
        { role: "relay_gate", boardVisibility: "hidden" },
        { activeType: "hidden" }
      )
    ).toBe(true);
    expect(
      matchesBoardTypeFilters(
        { role: "relay_gate", boardVisibility: "public" },
        { activeType: "all" }
      )
    ).toBe(true);
  });
});
