import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildMapReferenceSpineHtml,
  buildNetworkCharterSectionHtml,
  LO4_COMPREHENSION_MIN_STRANGERS,
  resolveNetworkCharter,
  validateReferenceNetworkTeaching,
} from "../../site/js/city-game-reference-network-core.mjs";
import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  assessLo4KitReady,
  buildLo4KitHtml,
} from "../scripts/city-game-reference-network-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-reference-network-core", () => {
  it("resolves network charter from season JSON", () => {
    const charter = resolveNetworkCharter(season);
    expect(charter.definition).toContain("public network");
    expect(charter.signers).toHaveLength(4);
    expect(charter.what_stays.length).toBeGreaterThanOrEqual(3);
    expect(charter.game_node_scan_url).toContain("humanity.llc/c/");
  });

  it("builds charter section with signer table and what stays", () => {
    const html = buildNetworkCharterSectionHtml(season);
    expect(html).toContain("Who may sign what");
    expect(html).toContain("What stays after the season");
    expect(html).toContain("reference operator");
    expect(html).toContain("<table");
  });

  it("builds reference spine on map board", () => {
    const spine = buildMapReferenceSpineHtml(season);
    expect(spine).toContain("How this network works");
    expect(spine).toContain("node_04");
    expect(spine).toContain("Collective unlock");

    const board = buildMapBoardInnerHtml(season);
    expect(board).toContain("city-game-map-spine");
    expect(board).toContain("city-game-map-debrief-mount");
  });

  it("validates teaching package engineering gate", () => {
    expect(validateReferenceNetworkTeaching(season).ok).toBe(true);
  });

  it("LO-4 human gate requires at least three strangers", () => {
    expect(LO4_COMPREHENSION_MIN_STRANGERS).toBe(3);
  });
});

describe("city-game-reference-network-kit-core", () => {
  it("assesses LO-4 kit ready for pilot season", () => {
    const report = assessLo4KitReady(root);
    expect(report.ready).toBe(true);
    expect(report.minStrangers).toBe(3);
  });

  it("builds operator teaching kit HTML", () => {
    const html = buildLo4KitHtml(root, { production: true });
    expect(html).toContain("LO-4");
    expect(html).toContain("Seven surfaces");
    expect(html).toContain("RN-1");
    expect(html).toContain("/play/cedar-rapids/map/");
    expect(html).toContain("status plate");
  });
});
