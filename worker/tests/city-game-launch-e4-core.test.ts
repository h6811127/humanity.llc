import { describe, expect, it } from "vitest";

import { assessWranglerCityGameEnabled } from "../scripts/city-game-launch-e4-core.mjs";

describe("city-game-launch-e4-core", () => {
  it("detects CITY_GAME_ENABLED=1", () => {
    expect(assessWranglerCityGameEnabled('CITY_GAME_ENABLED = "1"').enabled).toBe(true);
  });

  it("detects disabled flag", () => {
    expect(assessWranglerCityGameEnabled('CITY_GAME_ENABLED = "0"').enabled).toBe(false);
  });
});
