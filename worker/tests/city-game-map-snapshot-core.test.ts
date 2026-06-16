import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildNodeChipsHtml,
  formatFinaleFootnote,
  formatLaunchCollectiveLine,
  formatSpotlightCountFromSnap,
  formatSpotlightCountLine,
  formatSyncLabel,
  isSchematicPinFogged,
  signalWarSummaryLines,
  applyLobbyProgressFromSnapshot,
  applySnapshotToMapBoard,
  applySpotlightFromSnapshot,
} from "../../site/js/city-game-map-snapshot-core.mjs";
import {
  buildMapBoardInnerHtml,
  formatHookLine,
  formatProgressLine,
} from "../../site/js/city-game-map-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game map snapshot core", () => {
  it("builds chip html without player-tracking vocabulary", () => {
    const html = buildNodeChipsHtml([
      { kind: "collective", label: "City progress", value: "14 / 20" },
    ]);
    expect(html).toContain("14 / 20");
    expect(html.toLowerCase()).not.toMatch(/leaderboard|your progress|heatmap/i);
  });

  it("board shell includes snapshot sync hook and edge data attributes", () => {
    const html = buildMapBoardInnerHtml({
      season_id: "cr_season_01_wake",
      city: "Cedar Rapids, Iowa",
      districts: ["river_spine", "czech_village"],
      nodes: [
        {
          node_id: "node_04",
          object_id: "obj_cr_node_04_river",
          role: "temp_drop",
          district: "river_spine",
          label: "Riverwalk River Lantern",
        },
        {
          node_id: "node_07",
          object_id: "obj_cr_node_07_cabinet",
          role: "lore_archive",
          district: "czech_village",
          label: "Czech Village cabinet",
        },
      ],
      map_copy: {
        launch: {
          count_label: "River Lantern",
        },
      },
      unlock_edges: [
        { from: "node_04", to: "node_07", label: "River Lantern unlocks Czech Village cabinet" },
      ],
      map_layout: {
        version: 1,
        nodes: { node_04: { x: 0.5, y: 0.6 } },
      },
      automation: { quorum_nodes: ["node_04"], finale_node: "node_13", fragment_nodes: [] },
      comprehension_kit: { primary_scan_node: "node_04" },
    });
    expect(html).toContain('id="city-game-map-sync"');
    expect(html).toContain('id="city-game-map-signal-war"');
    expect(html).toContain('id="city-game-map-progress"');
    expect(html).toContain('id="city-game-map-spotlight"');
    expect(html).toContain('data-edge-from="node_04"');
    expect(html).toContain('data-node-id="node_04"');
    expect(html).toContain("city-game-map-node-live");
    expect(html).toContain("Open in Maps");
    expect(html).toContain("Live count opens when play starts.");
  });

  it("formats launch collective line from chip value", () => {
    expect(formatLaunchCollectiveLine("14 / 20")).toBe("14 of 20 together");
    expect(formatSpotlightCountLine("14 / 20")).toBe("14 of 20 together");
  });

  it("formats spotlight count from collective chip", () => {
    expect(
      formatSpotlightCountFromSnap({
        chips: [{ kind: "collective", label: "City progress", value: "14 / 20" }],
      })
    ).toBe("14 / 20");
    expect(formatSpotlightCountFromSnap({ chips: [] })).toBeNull();
  });

  it("formats spotlight count line for launch collective display", () => {
    expect(formatSpotlightCountLine("14 / 20", "River Lantern")).toBe("14 of 20 together");
    expect(formatSpotlightCountLine("14 / 20", "")).toBe("14 of 20 together");
    expect(formatSpotlightCountLine(null, "River Lantern")).toBeNull();
  });

  it("applySpotlightFromSnapshot updates spotlight count element", () => {
    const countEl = { textContent: "Live count opens when play starts." };
    const liveEl = { innerHTML: "" };
    const spotlight = {
      dataset: {
        nodeId: "node_04",
        countPlaceholder: "Live count opens when play starts.",
        scanHint: "Find the River Lantern",
      },
      classList: { toggle: () => {} },
    };
    const boardRoot = {
      querySelector: (sel) => {
        if (sel === "#city-game-map-spotlight") return spotlight;
        if (sel === "#city-game-map-spotlight-count") return countEl;
        if (sel === "#city-game-map-spotlight-live") return liveEl;
        return null;
      },
    };

    applySpotlightFromSnapshot(/** @type {HTMLElement} */ (boardRoot), {
      nodes: [
        {
          node_id: "node_04",
          chips: [{ kind: "collective", label: "City progress", value: "14 / 20" }],
        },
      ],
    });
    expect(countEl.textContent).toBe("14 / 20");
  });

  it("formats sync label from snapshot timestamp", () => {
    expect(formatSyncLabel("2026-06-07T18:00:00.000Z")).toContain("Updated ·");
  });

  it("formats lobby hook and progress from snapshot finale", () => {
    expect(formatProgressLine({ fragments: { claimed: 1, required: 3 } })).toBe(
      "1 / 3 fragments recovered"
    );
    expect(formatHookLine({ fragments: { claimed: 1 } })).toBe("Something is stirring.");
    expect(formatHookLine({ fragments: { claimed: 3, complete: true } })).toBe("The city woke.");

    /** @type {Record<string, HTMLElement>} */
    const nodes = {};
    const lobby = {
      dataset: {
        hook: "The city is asleep.",
        hookStirring: "Something is stirring.",
        hookAwake: "The city woke.",
        progressSuffix: "fragments recovered",
      },
    };
    const progressEl = { textContent: "" };
    const hookEl = { textContent: "" };
    const boardRoot = {
      querySelector: (sel) => {
        if (sel === ".city-game-map-lobby") return lobby;
        if (sel === "#city-game-map-progress") return progressEl;
        if (sel === "#city-game-map-hook") return hookEl;
        return nodes[sel] ?? null;
      },
    };

    applyLobbyProgressFromSnapshot(/** @type {HTMLElement} */ (boardRoot), {
      finale: { fragments: { claimed: 2, required: 3, complete: false } },
    });
    expect(progressEl.textContent).toBe("2 / 3 fragments recovered");
    expect(hookEl.textContent).toBe("Something is stirring.");
  });

  it("extracts signal war summary lines from snapshot (SW-07)", () => {
    expect(
      signalWarSummaryLines({
        signal_war: {
          summary_lines: ["Red · 10 network pts", "Blue · 6 network pts"],
        },
      })
    ).toEqual(["Red · 10 network pts", "Blue · 6 network pts"]);
    expect(signalWarSummaryLines({})).toEqual([]);
  });

  it("formats finale lattice footnote from snapshot", () => {
    const line = formatFinaleFootnote(
      {
        node_id: "node_13",
        open: true,
        fragments: { claimed: 3, required: 3, complete: true },
      },
      "Wake the city"
    );
    expect(line).toBe("Wake the city: 3 / 3 fragments — complete");
  });

  it("applySnapshotToMapBoard labels routes Next, Open, and Locked from primary node", () => {
    if (typeof globalThis.HTMLElement === "undefined") {
      globalThis.HTMLElement = class HTMLElement {} as typeof HTMLElement;
    }

    /**
     * @returns {{ el: HTMLElement; classes: Set<string>; stateEl: { textContent: string } }}
     */
    function mockRouteRow() {
      const el = new HTMLElement();
      const classes = new Set<string>();
      el.classList = {
        toggle(cls: string, on?: boolean) {
          if (on) classes.add(cls);
          else classes.delete(cls);
        },
      } as DOMTokenList;
      el.dataset = {} as DOMStringMap;
      const stateEl = new HTMLElement();
      stateEl.textContent = "";
      el.querySelector = ((sel: string) =>
        sel === ".city-game-map-route-state" ? stateEl : null) as typeof el.querySelector;
      return { el, classes, stateEl };
    }

    const nextRow = mockRouteRow();
    const openRow = mockRouteRow();
    const lockedRow = mockRouteRow();

    const boardRoot = {
      dataset: { primaryNode: "node_04" },
      querySelectorAll(selector: string) {
        if (selector === ".city-game-map-node-row[data-node-id]") return [];
        if (selector === ".city-game-map-pin[data-node-id]") return [];
        if (selector === '[data-edge-from="node_04"][data-edge-to="node_07"]') return [nextRow.el];
        if (selector === '[data-edge-from="node_04"][data-edge-to="node_13"]') return [openRow.el];
        if (selector === '[data-edge-from="node_07"][data-edge-to="node_13"]') return [lockedRow.el];
        return [];
      },
      querySelector() {
        return null;
      },
    };

    applySnapshotToMapBoard(/** @type {HTMLElement} */ (boardRoot), {
      unlock_edges: [
        { from: "node_04", to: "node_07", satisfied: false },
        { from: "node_04", to: "node_13", satisfied: true },
        { from: "node_07", to: "node_13", satisfied: false },
      ],
    });

    expect(nextRow.stateEl.textContent).toBe("Next");
    expect(nextRow.classes.has("city-game-map-route-row--next")).toBe(true);
    expect(nextRow.el.dataset.routeLocked).toBe("false");

    expect(openRow.stateEl.textContent).toBe("Open");
    expect(openRow.classes.has("city-game-map-route-row--unlocked")).toBe(true);
    expect(openRow.el.dataset.routeLocked).toBe("false");

    expect(lockedRow.stateEl.textContent).toBe("Locked");
    expect(lockedRow.classes.has("city-game-map-route-row--next")).toBe(false);
    expect(lockedRow.el.dataset.routeLocked).toBe("true");
  });

  it("applySnapshotToMapBoard preserves state-first selectors on node rows", () => {
    if (typeof globalThis.HTMLElement === "undefined") {
      globalThis.HTMLElement = class HTMLElement {} as typeof HTMLElement;
    }

    const effectEl = new HTMLElement();
    effectEl.textContent = "Static consequence";
    const chipsEl = new HTMLElement();
    chipsEl.hidden = true;
    const liveEl = new HTMLElement();
    liveEl.innerHTML = '<span class="city-game-map-live-hint">Scan sticker there</span>';

    const rowClasses = new Set<string>();
    const rowAttrs = new Map([
      ["data-node-id", "node_04"],
      ["data-role", "temp_drop"],
      ["data-board-visibility", "public"],
      ["data-board-states", "live"],
    ]);
    const row = {
      hidden: false,
      getAttribute(name: string) {
        return rowAttrs.get(name) ?? null;
      },
      setAttribute(name: string, value: string) {
        rowAttrs.set(name, value);
      },
      classList: {
        add(cls: string) {
          rowClasses.add(cls);
        },
        remove(cls: string) {
          rowClasses.delete(cls);
        },
        toggle(cls: string, on?: boolean) {
          if (on) rowClasses.add(cls);
          else rowClasses.delete(cls);
        },
      },
      querySelector(sel: string) {
        if (sel === "[data-node-effect]") return effectEl;
        if (sel === "[data-node-chips]") return chipsEl;
        if (sel === ".city-game-map-node-live") return liveEl;
        if (sel === ".city-game-map-node-title") return null;
        return null;
      },
    };

    const boardRoot = {
      dataset: { rumoredNodes: "", primaryNode: "node_04" },
      querySelectorAll(selector: string) {
        if (selector === ".city-game-map-node-row[data-node-id]") return [row];
        if (selector === ".city-game-map-pin[data-node-id]") return [];
        return [];
      },
      querySelector() {
        return null;
      },
    };

    applySnapshotToMapBoard(/** @type {HTMLElement} */ (boardRoot), {
      map_visibility: "public",
      generated_at: "2026-06-07T18:00:00.000Z",
      nodes: [
        {
          node_id: "node_04",
          label: "Riverwalk River Lantern",
          scan_url: "https://humanity.llc/c/test?q=qr_04",
          chips: [{ kind: "collective", label: "City progress", value: "14 / 20" }],
          lifecycle: "active",
        },
      ],
      unlock_edges: [],
    });

    expect(effectEl.textContent).toContain("14 / 20");
    expect(chipsEl.hidden).toBe(false);
    expect(chipsEl.innerHTML).toContain("city-game-map-node-chips");
    expect(chipsEl.innerHTML).toContain("14 / 20");
    expect(liveEl.innerHTML).toContain("city-game-map-scan-link");
    expect(liveEl.innerHTML).toContain("https://humanity.llc/c/test?q=qr_04");
    expect(rowClasses.has("city-game-map-node-row--live")).toBe(true);
    expect(rowAttrs.get("data-board-visibility")).toBe("public");
  });

  it("empty snapshot fog keeps schematic pins visible and hittable (RC1)", () => {
    expect(isSchematicPinFogged("node_04", null)).toBe(true);
    expect(isSchematicPinFogged("node_04", { chips: [] })).toBe(false);

    const src = readFileSync(
      join(root, "site/js/city-game-map-snapshot-core.mjs"),
      "utf8"
    );
    const pinLoop = src.slice(
      src.indexOf('for (const pin of boardRoot.querySelectorAll(".city-game-map-pin')
    );
    expect(pinLoop).toContain("isSchematicPinFogged");
    expect(pinLoop).toContain("city-game-map-pin--fog-hidden");
    expect(pinLoop).not.toMatch(/pin\.hidden\s*=\s*fogHidden/);
  });
});
