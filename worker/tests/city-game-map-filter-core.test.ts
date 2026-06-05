import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  applyBoardFilterVisibility,
  isBoardFilterChipEmphasized,
  setStateFilter,
  setTypeFilter,
  syncStateFilterUi,
  syncTypeFilterUi,
} from "../../site/js/city-game-map-filter-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

/**
 * @param {Array<{ node_id: string; district: string; role: string; boardStates?: string; boardVisibility?: string }>} nodes
 */
function mockBoardRoot(nodes) {
  /** @type {Array<{ district: string; role: string; boardStates: string; boardVisibility: string; hidden: boolean }>} */
  const rows = nodes.map((node) => ({
    district: node.district,
    role: node.role,
    boardStates: node.boardStates ?? "needs_action",
    boardVisibility: node.boardVisibility ?? "public",
    hidden: false,
  }));
  /** @type {Array<{ role: string; boardStates: string; boardVisibility: string; hidden: boolean }>} */
  const pins = nodes.map((node) => ({
    role: node.role,
    boardStates: node.boardStates ?? "needs_action",
    boardVisibility: node.boardVisibility ?? "public",
    hidden: false,
  }));

  const districts = [...new Set(nodes.map((n) => n.district))];
  /** @type {Array<{ district: string; hidden: boolean; rowRefs: typeof rows }>} */
  const blocks = districts.map((district) => ({
    district,
    hidden: false,
    rowRefs: rows.filter((row) => row.district === district),
  }));

  /** @type {{ hidden: boolean; scopeText: string; countText: string }} */
  const summary = {
    hidden: true,
    scopeText: "",
    countText: "",
  };

  /** @type {Record<string, { label: string }>} */
  const typeButtons = {
    all: { label: "All" },
    relay_gate: { label: "Relays" },
  };

  /** @type {Record<string, { label: string }>} */
  const stateButtons = {
    all: { label: "All states" },
    needs_action: { label: "Needs action" },
  };

  /**
   * @param {string} selector
   */
  function queryFilterButton(selector) {
    const typeMatch = selector.match(/^\[data-type-filter="([^"]+)"\]$/);
    if (typeMatch) {
      const id = typeMatch[1];
      const meta = typeButtons[id];
      if (!meta) return null;
      return {
        getAttribute(name) {
          if (name === "data-filter-label") return meta.label;
          return null;
        },
        textContent: meta.label,
      };
    }
    const stateMatch = selector.match(/^\[data-state-filter="([^"]+)"\]$/);
    if (stateMatch) {
      const id = stateMatch[1];
      const meta = stateButtons[id];
      if (!meta) return null;
      return {
        getAttribute(name) {
          if (name === "data-filter-label") return meta.label;
          return null;
        },
        textContent: meta.label,
      };
    }
    return null;
  }

  const boardRoot = {
    dataset: {
      activeType: "all",
      activeState: "all",
      activeExplore: "all",
      activeDistrict: "all",
    },
    querySelectorAll(selector) {
      if (selector === ".city-game-map-node-row[data-node-id]") {
        return rows.map((row) => ({
          getAttribute(name) {
            if (name === "data-district") return row.district;
            if (name === "data-role") return row.role;
            if (name === "data-board-states") return row.boardStates;
            if (name === "data-board-visibility") return row.boardVisibility;
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
      if (selector === ".city-game-map-pin[data-node-id]") {
        return pins.map((pin) => ({
          getAttribute(name) {
            if (name === "data-role") return pin.role;
            if (name === "data-board-states") return pin.boardStates;
            if (name === "data-board-visibility") return pin.boardVisibility;
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
    querySelector(selector) {
      if (selector === "#city-game-map-filter-summary") {
        return {
          get hidden() {
            return summary.hidden;
          },
          set hidden(value) {
            summary.hidden = Boolean(value);
          },
          querySelector(sel) {
            if (sel === "[data-filter-summary-scope]") {
              return {
                get textContent() {
                  return summary.scopeText;
                },
                set textContent(value) {
                  summary.scopeText = String(value ?? "");
                },
              };
            }
            if (sel === "[data-filter-summary-count]") {
              return {
                get textContent() {
                  return summary.countText;
                },
                set textContent(value) {
                  summary.countText = String(value ?? "");
                },
                hidden: true,
              };
            }
            return null;
          },
        };
      }
      return queryFilterButton(selector);
    },
  };

  return { boardRoot, rows, pins, blocks, summary };
}

function mockFilterButton(filterKey, filterValue) {
  let active = false;
  const calls = [];
  return {
    getAttribute(name) {
      if (name === `data-${filterKey}`) return filterValue;
      const hit = calls.filter(([n]) => n === name).at(-1);
      return hit ? hit[1] : null;
    },
    classList: {
      toggle(_className, on) {
        active = Boolean(on);
      },
      get active() {
        return active;
      },
    },
    setAttribute(name, value) {
      calls.push([name, value]);
    },
  };
}

describe("city-game-map-filter-core", () => {
  it("only emphasizes narrowed chips, not All reset chips", () => {
    expect(isBoardFilterChipEmphasized("relay_gate")).toBe(true);
    expect(isBoardFilterChipEmphasized("needs_action")).toBe(true);
    expect(isBoardFilterChipEmphasized("all")).toBe(false);
  });

  it("syncTypeFilterUi highlights narrowed type only", () => {
    const allBtn = mockFilterButton("type-filter", "all");
    const relayBtn = mockFilterButton("type-filter", "relay_gate");
    const boardRoot = {
      querySelector: () => ({
        querySelectorAll: () => [allBtn, relayBtn],
      }),
    };

    syncTypeFilterUi(/** @type {HTMLElement} */ (boardRoot), "relay_gate");
    expect(allBtn.classList.active).toBe(false);
    expect(relayBtn.classList.active).toBe(true);
    expect(relayBtn.getAttribute("aria-pressed")).toBe("true");
    expect(allBtn.getAttribute("aria-pressed")).toBe("false");

    syncTypeFilterUi(/** @type {HTMLElement} */ (boardRoot), "all");
    expect(allBtn.classList.active).toBe(false);
    expect(relayBtn.classList.active).toBe(false);
    expect(allBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("syncStateFilterUi highlights narrowed state only", () => {
    const allBtn = mockFilterButton("state-filter", "all");
    const needsBtn = mockFilterButton("state-filter", "needs_action");
    const boardRoot = {
      querySelector: () => ({
        querySelectorAll: () => [allBtn, needsBtn],
      }),
    };

    syncStateFilterUi(/** @type {HTMLElement} */ (boardRoot), "needs_action");
    expect(allBtn.classList.active).toBe(false);
    expect(needsBtn.classList.active).toBe(true);

    syncStateFilterUi(/** @type {HTMLElement} */ (boardRoot), "all");
    expect(allBtn.classList.active).toBe(false);
    expect(needsBtn.classList.active).toBe(false);
  });

  it("filters rows and pins by type role group", () => {
    const nodes = season.nodes.map(
      (row: { node_id: string; district: string; role: string }) => ({
        node_id: row.node_id,
        district: row.district,
        role: row.role,
      })
    );
    const { boardRoot, rows, pins } = mockBoardRoot(nodes);

    setTypeFilter(/** @type {HTMLElement} */ (boardRoot), "relay_gate");

    const visibleRows = rows.filter((row) => !row.hidden);
    expect(visibleRows.length).toBe(17);
    expect(visibleRows.every((row) => row.role === "relay_gate")).toBe(true);
    expect(pins.filter((pin) => !pin.hidden).length).toBe(17);
  });

  it("combines type and state filters with AND logic", () => {
    const nodes = [
      {
        node_id: "node_a",
        district: "river_spine",
        role: "relay_gate",
        boardStates: "needs_action",
      },
      {
        node_id: "node_b",
        district: "newbo",
        role: "relay_gate",
        boardStates: "locked",
      },
    ];
    const { boardRoot, rows } = mockBoardRoot(nodes);

    setTypeFilter(/** @type {HTMLElement} */ (boardRoot), "relay_gate");
    setStateFilter(/** @type {HTMLElement} */ (boardRoot), "needs_action");

    const visible = rows.filter((row) => !row.hidden);
    expect(visible.length).toBe(1);
    expect(visible[0]?.role).toBe("relay_gate");
    expect(visible[0]?.boardStates).toBe("needs_action");
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

    setTypeFilter(/** @type {HTMLElement} */ (boardRoot), "finale");
    expect(rows.filter((row) => !row.hidden).length).toBe(2);

    setTypeFilter(/** @type {HTMLElement} */ (boardRoot), "all");
    setStateFilter(/** @type {HTMLElement} */ (boardRoot), "all");
    expect(rows.filter((row) => !row.hidden).length).toBe(season.nodes.length);
  });

  it("applyBoardFilterVisibility hides empty district blocks under type filter", () => {
    const nodes = [
      { node_id: "node_a", district: "downtown", role: "care_loop" },
      { node_id: "node_b", district: "newbo", role: "relay_gate" },
    ];
    const { boardRoot, blocks } = mockBoardRoot(nodes);

    boardRoot.dataset.activeType = "care_loop";
    applyBoardFilterVisibility(/** @type {HTMLElement} */ (boardRoot));

    expect(blocks.find((b) => b.district === "downtown")?.hidden).toBe(false);
    expect(blocks.find((b) => b.district === "newbo")?.hidden).toBe(true);
  });

  it("board html includes type and state toolbars with data-role on rows", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html).toContain("city-game-map-type-filter");
    expect(html).toContain('data-type-filter="relay_gate"');
    expect(html).toContain("Relays");
    expect(html).toContain("city-game-map-state-filter");
    expect(html).toContain('data-state-filter="needs_action"');
    expect(html).toContain('data-role="relay_gate"');
    expect(html).toContain("city-game-map-filter-summary");
    expect(html).toContain("Clear filters");
    expect(html).not.toContain("city-game-map-roles-details");
    expect(html).toContain("city-game-map-start-callout");
  });

  it("syncBoardFilterSummary merges type, state, and count into scope line", () => {
    const nodes = season.nodes.map(
      (row: { node_id: string; district: string; role: string }) => ({
        node_id: row.node_id,
        district: row.district,
        role: row.role,
      })
    );
    const { boardRoot, rows, summary } = mockBoardRoot(nodes);

    boardRoot.dataset.activeType = "relay_gate";
    boardRoot.dataset.activeState = "needs_action";
    applyBoardFilterVisibility(/** @type {HTMLElement} */ (boardRoot));

    expect(summary.hidden).toBe(false);
    const visible = rows.filter((row) => !row.hidden).length;
    expect(summary.scopeText).toContain("Relays");
    expect(summary.scopeText).toContain("Needs action");
    expect(summary.scopeText).toContain(
      visible === 1 ? "1 place" : `${visible} places`
    );
  });
});
