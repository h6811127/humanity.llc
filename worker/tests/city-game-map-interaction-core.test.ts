import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildDistrictFilterHtml,
  buildDistrictFilterOptions,
  buildMapBoardAbsoluteShareUrl,
  buildMapBoardSharePath,
  buildMapSelectionBarHtml,
  CITY_GAME_MAP_DENSE_NODE_THRESHOLD,
  isDenseMapBoard,
  isMapPinInteractive,
  readMapBoardNodeQueryParam,
  readMapBoardQueryState,
  readMapBoardShareStateFromRoot,
  resolveMapNodeHighlight,
  resolvePrimarySketchFigure,
  resolveSelectionBarCopy,
  resolveSketchPin,
  shouldScrollSketchForRowFocus,
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

  it("renders filter toolbar html without filled All chip", () => {
    const html = buildDistrictFilterHtml(season);
    expect(html).toContain('data-district-filter="all"');
    expect(html).toContain('data-district-filter="river_spine"');
    expect(html).toContain("city-game-map-filter-label");
    expect(html).toContain("District");
    expect(html).not.toMatch(
      /data-district-filter="all"[^>]*city-game-map-filter-btn--active/
    );
  });

  it("styles include M4 highlight and filter chrome", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain(".city-game-map-pin--highlight");
    expect(styles).toContain(".city-game-map-node-row--highlight");
    expect(styles).toContain(".city-game-map-filter-btn");
    expect(styles).toContain(".city-game-map-filter-btn--active");
    expect(styles).toContain(".city-game-map-filter-summary");
    expect(styles).toContain(".city-game-map-list-scroll");
    expect(styles).toContain(".city-game-map-filter-clear");
    expect(styles).toContain(".city-game-map-node-row[hidden]");
    expect(styles).toContain(".city-game-map-selection-bar");
    expect(styles).toContain(".city-game-map-selection-bar-action");
    expect(styles).toContain(".city-game-map-board--place-selected");
  });

  it("accepts SVG pin targets on board click", () => {
    const src = readFileSync(join(root, "site/js/city-game-map-interaction.mjs"), "utf8");
    const boardClick = src.slice(src.indexOf('boardRoot.addEventListener("click"'));
    expect(boardClick).toContain("if (!(target instanceof Element)) return;");
    expect(src).toContain('row.setAttribute("aria-current", "true")');
    expect(src).toContain("function selectMapPin(");
    expect(src).toContain("isMapPinInteractive");
    expect(src).toContain("setTypeFilter");
    expect(src).toContain("clearBoardFilters");
    expect(src).toContain("applyBoardFilterVisibility");
    expect(src).toContain("readMapBoardQueryState");
    expect(src).toContain("setDistrictFilter");
    expect(src).toContain("syncMapBoardUrl");
    expect(src).toContain("data-copy-board-link");
    expect(src).toContain("syncSelectionFeedbackBar");
    expect(src).toContain("city-game-map-board--place-selected");
    expect(src).toContain("[data-show-on-sketch]");
    expect(src).not.toContain("scrollSketchOnRow");
    expect(src).not.toMatch(/scrollSketch:\s*scrollSketchOnRow/);
  });

  it("resolveMapNodeHighlight toggles off repeat selection", () => {
    expect(resolveMapNodeHighlight(null, "node_04")).toBe("node_04");
    expect(resolveMapNodeHighlight("node_04", "node_04")).toBeNull();
    expect(resolveMapNodeHighlight("node_04", "node_07")).toBe("node_07");
  });

  it("readMapBoardNodeQueryParam parses ?node= deep links", () => {
    expect(readMapBoardNodeQueryParam("?node=node_01")).toBe("node_01");
    expect(readMapBoardNodeQueryParam("?node=node_04&foo=bar")).toBe("node_04");
    expect(readMapBoardNodeQueryParam("")).toBeNull();
    expect(readMapBoardNodeQueryParam("?district=newbo")).toBeNull();
  });

  it("isMapPinInteractive rejects filter-hidden pins only", () => {
    expect(isMapPinInteractive({ hidden: true })).toBe(false);
    expect(isMapPinInteractive({ hasAttribute: (name) => name === "hidden" })).toBe(false);
    expect(
      isMapPinInteractive({
        hidden: false,
        hasAttribute: () => false,
        classList: { contains: (name) => name === "city-game-map-pin--fog-hidden" },
      })
    ).toBe(true);
    expect(isMapPinInteractive({ hidden: false, hasAttribute: () => false })).toBe(true);
  });

  it("fog styling does not disable schematic pin hit targets", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain(".city-game-map-pin--fog-hidden .city-game-map-pin-dot");
    expect(styles).not.toMatch(
      /\.city-game-map-pin--fog-hidden[^}]*pointer-events:\s*none/s
    );
  });

  it("shouldScrollSketchForRowFocus matches mobile stack media", () => {
    expect(shouldScrollSketchForRowFocus(() => true)).toBe(true);
    expect(shouldScrollSketchForRowFocus(() => false)).toBe(false);
  });

  it("buildMapSelectionBarHtml seeds hidden sticky feedback shell", () => {
    const html = buildMapSelectionBarHtml();
    expect(html).toContain("data-selection-bar");
    expect(html).toContain('data-show-on-sketch');
    expect(html).toContain("Show on sketch");
    expect(html).toContain("data-copy-board-link");
    expect(html).toContain("Copy link");
    expect(html).toContain("Selected place");
    expect(html).toContain('role="region"');
    expect(html).toContain(" hidden");
  });

  it("reads and builds shareable board URL state", () => {
    expect(readMapBoardQueryState("?node=node_04&type=relay_gate&state=unlocked&district=newbo")).toEqual({
      node: "node_04",
      type: "relay_gate",
      state: "unlocked",
      district: "newbo",
    });
    expect(readMapBoardQueryState("?type=invalid")).toEqual({
      node: null,
      type: "all",
      state: "all",
      district: "all",
    });
    expect(
      buildMapBoardSharePath("/play/cedar-rapids/map/", {
        node: "node_04",
        type: "relay_gate",
        district: "river_spine",
        state: "all",
      })
    ).toBe("/play/cedar-rapids/map/?node=node_04&type=relay_gate&district=river_spine");
    expect(
      buildMapBoardAbsoluteShareUrl(
        "/play/cedar-rapids/map/",
        { type: "hidden", district: "newbo" },
        "https://humanity.llc"
      )
    ).toBe("https://humanity.llc/play/cedar-rapids/map/?type=hidden&district=newbo");
    expect(
      readMapBoardShareStateFromRoot({
        dataset: {
          highlightNodeId: "node_01",
          activeType: "sanctuary",
          activeState: "unlocked",
          activeDistrict: "newbo",
        },
      })
    ).toEqual({ node: "node_01", type: "sanctuary", state: "unlocked", district: "newbo" });
  });

  it("resolveSelectionBarCopy prefers row title and meta", () => {
    expect(resolveSelectionBarCopy("Riverwalk River Lantern", "River spine · Clue")).toEqual({
      title: "Riverwalk River Lantern",
      meta: "River spine · Clue",
    });
    expect(resolveSelectionBarCopy("", "")).toEqual({
      title: "Selected place",
      meta: "",
    });
  });

  it("resolvePrimarySketchFigure prefers mobile sketch over advanced figure", () => {
    const mobileSketch = { tagName: "FIGURE" };
    const districtFigure = { tagName: "FIGURE" };
    const boardRoot = {
      querySelector: (sel: string) => {
        if (sel === ".city-game-map-mobile-sketch") return mobileSketch;
        if (sel === "#district-sketch .city-game-map-figure") return districtFigure;
        return null;
      },
    };
    expect(resolvePrimarySketchFigure(boardRoot)).toBe(mobileSketch);
  });

  it("resolveSketchPin prefers mobile sketch pin", () => {
    const mobilePin = { tagName: "g", hidden: false, hasAttribute: () => false };
    const boardRoot = {
      querySelector: (sel: string) => {
        if (sel.startsWith(".city-game-map-mobile-sketch")) return mobilePin;
        return null;
      },
    };
    expect(resolveSketchPin(boardRoot, "node_04")).toBe(mobilePin);
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
