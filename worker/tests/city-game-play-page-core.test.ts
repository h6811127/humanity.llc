import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildMapBoardInnerHtml,
  showMapBoardError,
} from "../../site/js/city-game-map-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const rulesHtml = readFileSync(
  join(root, "site/play/cedar-rapids/index.html"),
  "utf8"
);

describe("city game play page integration", () => {
  it("renders board shell with list + sketch sections", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html).toContain('id="city-game-map-list-title"');
    expect(html).toContain('id="district-sketch"');
    expect(html).toContain("city-game-map-sketch-block");
    expect(html).toContain("city-game-map-svg");
    expect(html).toContain("Open in Maps");
  });

  it("showMapBoardError replaces loading placeholder copy", () => {
    const mount = { innerHTML: '<p class="city-game-map-loading">Loading…</p>' };
    showMapBoardError(/** @type {HTMLElement} */ (mount), "City board could not load.");
    expect(mount.innerHTML).toContain("city-game-map-error");
    expect(mount.innerHTML).not.toContain("Loading…");
  });

  it("play page uses single boot script", () => {
    expect(rulesHtml).toContain("city-game-play-page.mjs");
    expect(rulesHtml.match(/city-game-play-page\.mjs/g)?.length).toBe(1);
    expect(rulesHtml).not.toContain("city-game-map-board.mjs");
    expect(rulesHtml).not.toContain("city-game-season-banner.mjs");
  });

  it("rules page includes network charter mount and teaching order", () => {
    expect(rulesHtml).toContain('id="city-game-network-charter-mount"');
    expect(rulesHtml).toContain("Public network · Cedar Rapids");
    expect(rulesHtml).toContain("city-game-mechanics-deep");
    expect(rulesHtml).toContain("city-game-rules-guide-grid");
    expect(rulesHtml).toContain("hc-emphasis-card");
    expect(rulesHtml.indexOf("rules-prove-title")).toBeLessThan(
      rulesHtml.indexOf("rules-start-title")
    );
  });
});
