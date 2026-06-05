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

  it("dedicated map page uses single boot script", () => {
    expect(mapPageHtml).toContain("city-game-map-page.mjs");
    expect(mapPageHtml.match(/city-game-map-page\.mjs/g)?.length).toBe(1);
    expect(mapPageHtml).not.toContain("city-game-map-board.mjs");
  });
});
