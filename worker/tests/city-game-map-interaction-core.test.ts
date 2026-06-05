import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildDistrictFilterHtml,
  buildDistrictFilterOptions,
  CITY_GAME_MAP_DENSE_NODE_THRESHOLD,
  isDenseMapBoard,
} from "../../site/js/city-game-map-interaction-core.mjs";
import { validateMapLayout } from "../../site/js/city-game-map-board-core.mjs";
import { spreadMapLayoutNodes } from "../scripts/spread-city-game-map-layout.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-map-interaction-core", () => {
  it("marks board dense when node count meets threshold", () => {
    expect(CITY_GAME_MAP_DENSE_NODE_THRESHOLD).toBe(25);
    expect(isDenseMapBoard(season)).toBe(season.nodes.length >= CITY_GAME_MAP_DENSE_NODE_THRESHOLD);
  });

  it("builds district filter options from season.districts", () => {
    const options = buildDistrictFilterOptions(season);
    expect(options.map((o) => o.id)).toEqual(season.districts);
    expect(options.find((o) => o.id === "newbo")?.label).toBe("NewBo");
  });

  it("renders filter toolbar html", () => {
    const html = buildDistrictFilterHtml(season);
    expect(html).toContain('data-district-filter="all"');
    expect(html).toContain('data-district-filter="river_spine"');
  });

  it("styles include M4 highlight and filter chrome", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain(".city-game-map-pin--highlight");
    expect(styles).toContain(".city-game-map-node-row--highlight");
    expect(styles).toContain(".city-game-map-filter-btn");
  });

  it("accepts SVG pin targets on board click", () => {
    const src = readFileSync(join(root, "site/js/city-game-map-interaction.mjs"), "utf8");
    const boardClick = src.slice(src.indexOf('boardRoot.addEventListener("click"'));
    expect(boardClick).toContain("if (!(target instanceof Element)) return;");
  });
});

describe("spread-city-game-map-layout", () => {
  it("assigns every registry node a position in [0, 1]", () => {
    const positions = spreadMapLayoutNodes(season.nodes);
    expect(Object.keys(positions)).toHaveLength(season.nodes.length);
    const merged = { ...season, map_layout: { version: 1, nodes: positions } };
    expect(validateMapLayout(merged)).toEqual([]);
  });
});
