import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildPlayerFlowFieldWalkKitHtml,
  PLAYER_FLOW_FIELD_MIN_STRANGERS,
  playerFlowRelativeUrlsForSeason,
  playerFlowUrlsForSeason,
  productionPlayerFlowFieldWalkUrl,
  validatePlayerFlowFieldWalkKitHtml,
} from "../../site/js/public-network-player-flow-field-kit-core.mjs";
import {
  assessPlayerFlowFieldKitReady,
  buildPlayerFlowFieldKitHtml,
} from "../scripts/public-network-player-flow-field-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("public-network-player-flow-field-kit-core", () => {
  it("resolves player flow URLs for pilot season", () => {
    const urls = playerFlowUrlsForSeason(season);
    expect(urls.board).toContain("/play/cedar-rapids/map/");
    expect(urls.rulesProve).toContain("#rules-prove-title");
    expect(urls.discover).toContain("/discover/cedar-rapids-iowa/");
  });

  it("resolves production field walk URL", () => {
    const url = productionPlayerFlowFieldWalkUrl(season);
    expect(url).toContain("/play/cedar-rapids/comprehension/player-flow-field-walk.html");
  });

  it("builds field walk kit with PD scenarios", () => {
    const html = buildPlayerFlowFieldWalkKitHtml({
      urls: playerFlowRelativeUrlsForSeason(season),
    });
    expect(validatePlayerFlowFieldWalkKitHtml(html).ok).toBe(true);
    expect(html).toContain("PD-1");
    expect(html).toContain("PD-5");
    expect(html).toContain("What a scan proves");
  });

  it(`human gate requires ${PLAYER_FLOW_FIELD_MIN_STRANGERS} strangers`, () => {
    expect(PLAYER_FLOW_FIELD_MIN_STRANGERS).toBeGreaterThanOrEqual(3);
  });
});

describe("public-network-player-flow-field-kit script", () => {
  it("generates valid kit HTML from season JSON", () => {
    const html = buildPlayerFlowFieldKitHtml(root);
    expect(validatePlayerFlowFieldWalkKitHtml(html).ok).toBe(true);
  });

  it("assesses kit ready after generate", () => {
    buildPlayerFlowFieldKitHtml(root);
    const report = assessPlayerFlowFieldKitReady(root);
    expect(report.ready).toBe(true);
  });
});
