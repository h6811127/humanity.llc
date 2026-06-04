import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildFactionPledgeRecord,
  parseFactionPledgeRecord,
  readFactionPledgeForSeason,
  resolveSignalWarGuideSteps,
} from "../../site/js/city-game-signal-war-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const crSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-signal-war-core", () => {
  it("round-trips device-local pledge records", () => {
    const record = buildFactionPledgeRecord("cr_season_01_wake", "blue");
    const parsed = parseFactionPledgeRecord(record);
    expect(parsed?.faction).toBe("blue");
    expect(
      readFactionPledgeForSeason(JSON.stringify(record), "cr_season_01_wake")?.faction
    ).toBe("blue");
    expect(readFactionPledgeForSeason(JSON.stringify(record), "other")).toBeNull();
  });

  it("resolves Signal War guide steps from season JSON", () => {
    const steps = resolveSignalWarGuideSteps(crSeason);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]?.title).toMatch(/Signal War/i);
  });
});
