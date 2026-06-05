import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildExploreFilterHtml,
  buildExploreFilterOptions,
  countNodesByRole,
  matchesBoardNodeFilters,
  matchesDistrictFilter,
  matchesExploreFilter,
} from "../../site/js/city-game-map-explore-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-map-explore-core", () => {
  it("counts roles present in season nodes only", () => {
    const counts = countNodesByRole(season);
    expect(counts.get("relay_gate")).toBe(17);
    expect(counts.get("lore_archive")).toBe(7);
    expect(counts.get("finale")).toBe(2);
    expect(counts.has("mobile_lore")).toBe(false);
  });

  it("builds explore options with config labels and omits unused roles", () => {
    const options = buildExploreFilterOptions(season);
    expect(options.map((o) => o.id)).not.toContain("mobile_lore");
    expect(options.find((o) => o.id === "relay_gate")).toEqual({
      id: "relay_gate",
      label: "Relay",
      count: 17,
    });
    expect(options.find((o) => o.id === "lore_archive")?.label).toBe("Story");
  });

  it("renders explore toolbar with counts and neutral All kinds chip", () => {
    const html = buildExploreFilterHtml(season);
    expect(html).toContain('data-explore-filter="all"');
    expect(html).toContain('data-explore-filter="relay_gate"');
    expect(html).toContain('data-filter-label="Relay"');
    expect(html).toContain("city-game-map-filter-btn-count");
    expect(html).toContain("Relay");
    expect(html).toContain("Story");
    expect(html).not.toContain("Moving story");
    expect(html).toContain("Explore by");
    expect(html).not.toMatch(
      /data-explore-filter="all"[^>]*city-game-map-filter-btn--active/
    );
  });

  it("falls back to role labels when map_board.explore_by is absent", () => {
    const { map_board: _removed, ...bare } = season;
    const options = buildExploreFilterOptions(bare);
    expect(options.find((o) => o.id === "relay_gate")?.label).toBe("Relay spot");
  });

  it("matches district and explore filters with AND logic", () => {
    expect(matchesDistrictFilter("river_spine", "river_spine")).toBe(true);
    expect(matchesDistrictFilter("newbo", "river_spine")).toBe(false);
    expect(matchesDistrictFilter("newbo", null)).toBe(true);

    expect(matchesExploreFilter("relay_gate", "relay_gate")).toBe(true);
    expect(matchesExploreFilter("lore_archive", "relay_gate")).toBe(false);
    expect(matchesExploreFilter("relay_gate", null)).toBe(true);

    expect(
      matchesBoardNodeFilters(
        { district: "river_spine", role: "relay_gate" },
        { activeDistrict: "river_spine", activeExplore: "relay_gate" }
      )
    ).toBe(true);
    expect(
      matchesBoardNodeFilters(
        { district: "river_spine", role: "lore_archive" },
        { activeDistrict: "river_spine", activeExplore: "relay_gate" }
      )
    ).toBe(false);
    expect(
      matchesBoardNodeFilters(
        { district: "newbo", role: "relay_gate" },
        { activeDistrict: "river_spine", activeExplore: "relay_gate" }
      )
    ).toBe(false);
    expect(
      matchesBoardNodeFilters(
        { district: "river_spine", role: "relay_gate" },
        { activeDistrict: "all", activeExplore: "all" }
      )
    ).toBe(true);
  });
});
