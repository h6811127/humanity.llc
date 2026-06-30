import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildMapPageHtml,
  verifyMapPageHtml,
} from "../../site/js/city-game-map-page-scaffold-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const crSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const exampleSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-example-season-01.json"), "utf8")
);

describe("city-game-map-page-scaffold-core player flow", () => {
  it("generated map page includes discover browse footnote for listed region", () => {
    const html = buildMapPageHtml(crSeason, "city-game-cr-season-01.json");
    const verify = verifyMapPageHtml(html, crSeason);
    expect(verify.ok).toBe(true);
    expect(html).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(html).toContain("Browse places near me");
    expect(html).toContain("city-game-map-page-footnote");
  });

  it("planned template map page still includes canonical board path", () => {
    const html = buildMapPageHtml(exampleSeason, "city-game-example-season-01.json");
    const verify = verifyMapPageHtml(html, exampleSeason);
    expect(verify.ok).toBe(true);
    expect(html).toContain('rel="canonical" href="/play/example-city/map/"');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });
});
