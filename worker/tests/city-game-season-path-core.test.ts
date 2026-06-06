import { describe, expect, it } from "vitest";

import {
  pickSeasonFromIndex,
  playSlugFromPathname,
} from "../../site/js/city-game-season-resolve.mjs";
import {
  listSeasonJsonBasenames,
  loadAllSeasonConfigs,
  resolveSeasonConfigFile,
  resolveSeasonPathFromCli,
  seasonIndexEntryFromConfig,
  seasonJsonPublicUrl,
  seasonLaunchContext,
  seasonSlugFromRulesPath,
} from "../../site/js/city-game-season-path-core.mjs";

const root = new URL("../..", import.meta.url).pathname;

describe("city-game season path core", () => {
  it("lists bundled season JSON files", () => {
    const names = listSeasonJsonBasenames(root);
    expect(names).toContain("city-game-cr-season-01.json");
    expect(names).toContain("city-game-example-season-01.json");
    expect(names).not.toContain("city-game-cr-season-01-wave-open-nodes.json");
  });

  it("derives slug from rules_path", () => {
    expect(seasonSlugFromRulesPath("/play/cedar-rapids/")).toBe("cedar-rapids");
    expect(seasonSlugFromRulesPath("/play/example-city/")).toBe("example-city");
  });

  it("resolves season file by id and slug", () => {
    const byId = resolveSeasonConfigFile(root, { seasonId: "example_city_season_01" });
    expect(byId?.basename).toBe("city-game-example-season-01.json");
    const bySlug = resolveSeasonConfigFile(root, { slug: "cedar-rapids" });
    expect(bySlug?.config.season_id).toBe("cr_season_01_wake");
  });

  it("builds index entries with json_url and public_listing", () => {
    const configs = loadAllSeasonConfigs(root);
    const pilot = configs.find((c) => c.season_id === "cr_season_01_wake");
    expect(pilot).toBeTruthy();
    const entry = seasonIndexEntryFromConfig(pilot!, "city-game-cr-season-01.json");
    expect(entry.json_url).toBe(seasonJsonPublicUrl("city-game-cr-season-01.json"));
    expect(entry.slug).toBe("cedar-rapids");
    expect(entry.season_root_profile_id).toBe(pilot!.season_root_profile_id ?? null);
    expect(entry.public_listing?.listed).toBe(true);
    expect(entry.public_listing?.category).toBe("city_games");
  });

  it("seasonLaunchContext maps rules_path to play + comprehension paths", () => {
    const example = resolveSeasonConfigFile(root, { seasonId: "example_city_season_01" });
    expect(example).toBeTruthy();
    const ctx = seasonLaunchContext(example!.config, example!.basename);
    expect(ctx.rulesPath).toBe("/play/example-city/");
    expect(ctx.rulesPageRel).toBe("site/play/example-city/index.html");
  });

  it("CLI resolver defaults to pilot and accepts --season", () => {
    expect(resolveSeasonPathFromCli(root, ["node", "script"])).toMatch(
      /city-game-cr-season-01\.json$/
    );
    expect(
      resolveSeasonPathFromCli(root, ["node", "script", "--season", "example_city_season_01"])
    ).toMatch(/city-game-example-season-01\.json$/);
  });
});

describe("city-game season resolve (play pages)", () => {
  it("maps pathname to slug", () => {
    expect(playSlugFromPathname("/play/cedar-rapids/")).toBe("cedar-rapids");
    expect(playSlugFromPathname("/play/season/")).toBe("season");
  });

  it("picks season row from index by slug or id", () => {
    const index = {
      seasons: [
        {
          season_id: "cr_season_01_wake",
          slug: "cedar-rapids",
          json_url: "/data/city-game-cr-season-01.json",
          rules_path: "/play/cedar-rapids/",
        },
        {
          season_id: "example_city_season_01",
          slug: "example-city",
          json_url: "/data/city-game-example-season-01.json",
          rules_path: "/play/example-city/",
        },
      ],
    };
    expect(pickSeasonFromIndex(index, { slug: "example-city" })?.season_id).toBe(
      "example_city_season_01"
    );
    expect(pickSeasonFromIndex(index, { seasonId: "cr_season_01_wake" })?.slug).toBe(
      "cedar-rapids"
    );
    expect(pickSeasonFromIndex(index, { pathname: "/play/cedar-rapids/" })?.season_id).toBe(
      "cr_season_01_wake"
    );
  });
});
