import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const mapPageCoreSrc = readFileSync(
  join(root, "site/js/city-game-map-page-core.mjs"),
  "utf8"
);
const mapPageHtml = readFileSync(join(root, "site/play/cedar-rapids/map/index.html"), "utf8");

describe("city game map page boot", () => {
  it("wires M4 list↔pin interaction after board render", () => {
    expect(mapPageCoreSrc).toContain(
      'import { bootCityGameMapInteraction } from "./city-game-map-interaction.mjs"'
    );
    expect(mapPageCoreSrc).toContain("bootCityGameMapInteraction(boardRoot, season)");
    expect(mapPageCoreSrc.indexOf("bootCityGameMapInteraction(boardRoot, season)")).toBeLessThan(
      mapPageCoreSrc.indexOf("bootCityGameMapSnapshot(")
    );
  });

  it("resolves board context view before snapshot poll", () => {
    expect(mapPageCoreSrc).toContain('import { resolveBoardContextView } from "./city-game-board-context-core.mjs"');
    expect(mapPageCoreSrc).toContain("discoveryPinIndexRelForSeason");
    expect(mapPageCoreSrc).toContain("resolveBoardContextView(season, { pinIndex })");
    expect(mapPageCoreSrc).toContain("contextView.snapshot.season_id");
  });

  it("dedicated map page uses single boot script", () => {
    expect(mapPageHtml).toContain("city-game-map-page.mjs");
    expect(mapPageHtml.match(/city-game-map-page\.mjs/g)?.length).toBe(1);
    expect(mapPageHtml).not.toContain("city-game-map-board.mjs");
  });

  it("boots first-visit banner before board render", () => {
    expect(mapPageCoreSrc).toContain(
      'import { bootMapFirstVisitBanner } from "./city-game-map-first-visit-banner-core.mjs"'
    );
    expect(mapPageCoreSrc.indexOf("bootMapFirstVisitBanner(root, season)")).toBeLessThan(
      mapPageCoreSrc.indexOf("resolveBoardContextView(season, { pinIndex })")
    );
  });
});
