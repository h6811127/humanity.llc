import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildPlayPageHtml, verifyPlayPageHtml } from "../scripts/city-game-scaffold-play-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const crSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-play-page-scaffold-core player flow", () => {
  it("generated rules page includes player footnote with discover browse", () => {
    const html = buildPlayPageHtml(crSeason, "city-game-cr-season-01.json");
    const verify = verifyPlayPageHtml(html, crSeason);
    expect(verify.ok).toBe(true);
    expect(html).toContain("city-game-rules-player-footnote");
    expect(html).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(html).toContain('href="/play/cedar-rapids/#rules-prove-title"');
    expect(html).toContain("Open board");
  });
});
