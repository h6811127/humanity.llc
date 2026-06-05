import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  applyBoardFilterVisibility,
  setDistrictFilter,
  setExploreFilter,
} from "../../site/js/city-game-map-filter-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

/**
 * @param {Array<{ node_id: string; district: string; role: string }>} nodes
 */
function mockBoardRoot(nodes) {
  /** @type {Array<{ district: string; role: string; hidden: boolean }>} */
  const rows = nodes.map((node) => ({
    district: node.district,
    role: node.role,
    hidden: false,
  }));
  /** @type {Array<{ district: string; role: string; hidden: boolean }>} */
  const pins = nodes.map((node) => ({
    district: node.district,
    role: node.role,
    hidden: false,
  }));

  const districts = [...new Set(nodes.map((n) => n.district))];
  /** @type {Array<{ district: string; hidden: boolean; rowRefs: typeof rows }>} */
  const blocks = districts.map((district) => ({
    district,
    hidden: false,
    rowRefs: rows.filter((row) => row.district === district),
  }));

  const boardRoot = {
    dataset: {
      activeDistrict: "all",
      activeExplore: "all",
    },
    querySelectorAll(selector) {
      if (selector === ".city-game-map-node-row[data-node-id]") {
        return rows.map((row) => ({
          getAttribute(name) {
            if (name === "data-district") return row.district;
            if (name === "data-role") return row.role;
            return null;
          },
          get hidden() {
            return row.hidden;
          },
          set hidden(value) {
            row.hidden = Boolean(value);
          },
        }));
      }
      if (selector === ".city-game-map-pin[data-district]") {
        return pins.map((pin) => ({
          getAttribute(name) {
            if (name === "data-district") return pin.district;
            if (name === "data-role") return pin.role;
            return null;
          },
          get hidden() {
            return pin.hidden;
          },
          set hidden(value) {
            pin.hidden = Boolean(value);
          },
        }));
      }
      if (selector === ".city-game-map-district[data-district]") {
        return blocks.map((block) => ({
          getAttribute(name) {
            if (name === "data-district") return block.district;
            return null;
          },
          querySelectorAll(sel) {
            if (sel !== ".city-game-map-node-row") return [];
            return block.rowRefs.map((row) => ({
              get hidden() {
                return row.hidden;
              },
            }));
          },
          get hidden() {
            return block.hidden;
          },
          set hidden(value) {
            block.hidden = Boolean(value);
          },
        }));
      }
      return [];
    },
    querySelector() {
      return null;
    },
  };

  return { boardRoot, rows, pins, blocks };
}

describe("city-game-map-filter-core", () => {
  it("filters rows and pins by explore role", () => {
    const nodes = season.nodes.map(
      (row: { node_id: string; district: string; role: string }) => ({
        node_id: row.node_id,
        district: row.district,
        role: row.role,
      })
    );
    const { boardRoot, rows, pins } = mockBoardRoot(nodes);

    setExploreFilter(/** @type {HTMLElement} */ (boardRoot), "relay_gate");

    const visibleRows = rows.filter((row) => !row.hidden);
    expect(visibleRows.length).toBe(17);
    expect(visibleRows.every((row) => row.role === "relay_gate")).toBe(true);
    expect(pins.filter((pin) => !pin.hidden).length).toBe(17);
  });

  it("combines river spine district with relay explore using AND logic", () => {
    const nodes = season.nodes.map(
      (row: { node_id: string; district: string; role: string }) => ({
        node_id: row.node_id,
        district: row.district,
        role: row.role,
      })
    );
    const { boardRoot, rows } = mockBoardRoot(nodes);

    setDistrictFilter(/** @type {HTMLElement} */ (boardRoot), "river_spine");
    setExploreFilter(/** @type {HTMLElement} */ (boardRoot), "relay_gate");

    const visible = rows.filter((row) => !row.hidden);
    expect(visible.length).toBeGreaterThan(0);
    expect(
      visible.every((row) => row.district === "river_spine" && row.role === "relay_gate")
    ).toBe(true);
  });

  it("clears to all places when filters reset to all", () => {
    const nodes = season.nodes.map(
      (row: { node_id: string; district: string; role: string }) => ({
        node_id: row.node_id,
        district: row.district,
        role: row.role,
      })
    );
    const { boardRoot, rows } = mockBoardRoot(nodes);

    setExploreFilter(/** @type {HTMLElement} */ (boardRoot), "finale");
    expect(rows.filter((row) => !row.hidden).length).toBe(2);

    setExploreFilter(/** @type {HTMLElement} */ (boardRoot), "all");
    setDistrictFilter(/** @type {HTMLElement} */ (boardRoot), "all");
    expect(rows.filter((row) => !row.hidden).length).toBe(season.nodes.length);
  });

  it("applyBoardFilterVisibility hides empty district blocks under role filter", () => {
    const nodes = [
      { node_id: "node_a", district: "downtown", role: "care_loop" },
      { node_id: "node_b", district: "newbo", role: "relay_gate" },
    ];
    const { boardRoot, blocks } = mockBoardRoot(nodes);

    boardRoot.dataset.activeExplore = "care_loop";
    applyBoardFilterVisibility(/** @type {HTMLElement} */ (boardRoot));

    expect(blocks.find((b) => b.district === "downtown")?.hidden).toBe(false);
    expect(blocks.find((b) => b.district === "newbo")?.hidden).toBe(true);
  });

  it("board html includes explore toolbar and data-role on rows", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html).toContain("city-game-map-explore-filter");
    expect(html).toContain('data-explore-filter="relay_gate"');
    expect(html).toContain("Relay 17");
    expect(html).toContain('data-role="relay_gate"');
    expect(html).not.toContain("city-game-map-roles-details");
  });
});
