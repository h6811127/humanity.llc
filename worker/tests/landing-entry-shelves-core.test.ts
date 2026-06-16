import { describe, expect, it } from "vitest";

import {
  buildLandingCategoryUrl,
  formatLiveNowShelfCopy,
  landingShelfIdForCategory,
  readLandingCategoryQueryParam,
  resolveLandingShelfCategory,
} from "../../site/js/landing-entry-shelves-core.mjs";

describe("landing-entry-shelves-core", () => {
  it("maps shelf ids to portal categories", () => {
    expect(resolveLandingShelfCategory("landing-shelf-live-now")).toBe("city_games");
    expect(resolveLandingShelfCategory("landing-shelf-open-paused")).toBe("resources");
    expect(resolveLandingShelfCategory("landing-shelf-return-hours")).toBe("all");
    expect(landingShelfIdForCategory("city_games")).toBe("landing-shelf-live-now");
    expect(landingShelfIdForCategory("all")).toBeNull();
  });

  it("reads and builds shareable landing category URLs", () => {
    expect(readLandingCategoryQueryParam("?category=city_games")).toBe("city_games");
    expect(readLandingCategoryQueryParam("?category=markets")).toBe("markets");
    expect(readLandingCategoryQueryParam("?category=invalid")).toBe("all");
    expect(buildLandingCategoryUrl("city_games")).toBe("/?category=city_games");
    expect(buildLandingCategoryUrl("all")).toBe("/");
  });

  it("formats live-now shelf copy with place count", () => {
    expect(
      formatLiveNowShelfCopy({
        seasonName: "Wake the city",
        placeCount: 40,
        city: "Cedar Rapids",
      })
    ).toContain("40 places in Cedar Rapids");
    expect(formatLiveNowShelfCopy({ placeCount: null })).toContain("Weekend games");
  });
});
