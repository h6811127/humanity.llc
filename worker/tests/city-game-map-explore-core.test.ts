import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildExploreFilterHtml,
  buildExploreFilterOptions,
  countNodesByRole,
  matchesBoardNodeFilters,
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

  it("builds type filter options with chip labels and omits unused roles", () => {
    const options = buildExploreFilterOptions(season);
    expect(options.map((o) => o.id)).not.toContain("mobile_lore");
    expect(options.find((o) => o.id === "relay_gate")).toEqual({
      id: "relay_gate",
      label: "Relays",
      count: 17,
    });
    expect(options.find((o) => o.id === "lore")?.label).toBe("Lore");
  });

  it("renders type toolbar with counts and neutral All chip", () => {
    const html = buildExploreFilterHtml(season);
    expect(html).toContain('data-type-filter="all"');
    expect(html).toContain('data-type-filter="relay_gate"');
    expect(html).toContain('data-filter-label="Relays"');
    expect(html).toContain("city-game-map-filter-btn-count");
    expect(html).toContain("Relays");
    expect(html).toContain("Lore");
    expect(html).not.toContain("Moving story");
    expect(html).toContain("Type");
    expect(html).not.toMatch(
      /data-type-filter="all"[^>]*city-game-map-filter-btn--active/
    );
  });

  it("falls back to chip labels when map_board.explore_by is absent", () => {
    const { map_board: _removed, ...bare } = season;
    const options = buildExploreFilterOptions(bare);
    expect(options.find((o) => o.id === "relay_gate")?.label).toBe("Relays");
  });

  it("matches type filters on role groups", () => {
    expect(matchesExploreFilter("relay_gate", "public", "relay_gate")).toBe(true);
    expect(matchesExploreFilter("lore_archive", "public", "relay_gate")).toBe(false);
    expect(matchesExploreFilter("lore_archive", "public", "lore")).toBe(true);
    expect(matchesExploreFilter("relay_gate", "hidden", "hidden")).toBe(true);
    expect(matchesExploreFilter("relay_gate", "public", null)).toBe(true);

    expect(
      matchesBoardNodeFilters(
        { role: "relay_gate", boardVisibility: "public" },
        { activeType: "relay_gate" }
      )
    ).toBe(true);
    expect(
      matchesBoardNodeFilters(
        { role: "lore_archive", boardVisibility: "public" },
        { activeType: "relay_gate" }
      )
    ).toBe(false);
    expect(
      matchesBoardNodeFilters(
        { role: "relay_gate", boardVisibility: "public" },
        { activeType: "all" }
      )
    ).toBe(true);
  });
});
