import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  loadSeasonJsonFile,
  seasonLaunchContext,
} from "../../site/js/city-game-season-path-core.mjs";
import {
  buildPlayPageHtml,
  seasonWantsAutoRulesPage,
  verifyPlayPageHtml,
} from "../scripts/city-game-scaffold-play-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-scaffold-play-core", () => {
  it("derives launch paths from rules_path", () => {
    const config = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const ctx = seasonLaunchContext(config, "city-game-example-season-01.json");
    expect(ctx.slug).toBe("example-city");
    expect(ctx.rulesPageRel).toBe("site/play/example-city/index.html");
    expect(ctx.comprehensionPageRel).toBe(
      "site/play/example-city/comprehension/index.html"
    );
    expect(ctx.seasonJsonUrl).toBe("/data/city-game-example-season-01.json");
  });

  it("flags auto_rules_page seasons", () => {
    const example = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const pilot = loadSeasonJsonFile(root, "city-game-cr-season-01.json");
    expect(seasonWantsAutoRulesPage(example)).toBe(true);
    expect(seasonWantsAutoRulesPage(pilot)).toBe(false);
  });

  it("builds portable play page HTML from example season", () => {
    const config = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const html = buildPlayPageHtml(config, "city-game-example-season-01.json");
    const verify = verifyPlayPageHtml(html, config);

    expect(verify.ok).toBe(true);
    expect(html).toContain("/play/example-city/map/");
    expect(html).not.toContain('id="city-game-map-root"');
    expect(html).toContain("city-game-play-page.mjs");
    expect(html).toContain('id="city-game-player-guide-list"');
    expect(html).toContain('id="city-state"');
    expect(html).toContain("Template only.");
    expect(html).toMatch(/noindex/i);
  });

  it("example-city on-disk page matches contract when present", () => {
    const config = loadSeasonJsonFile(root, "city-game-example-season-01.json");
    const rel = seasonLaunchContext(config, "city-game-example-season-01.json")
      .rulesPageRel;
    const html = readFileSync(join(root, rel), "utf8");
    const verify = verifyPlayPageHtml(html, config);
    expect(verify.ok).toBe(true);
  });
});
