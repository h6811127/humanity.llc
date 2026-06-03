import { describe, expect, it } from "vitest";

import { seasonIdForStewardEntitlementsQuery } from "../../site/js/steward-entitlements-season-id-core.mjs";

describe("seasonIdForStewardEntitlementsQuery", () => {
  const index = {
    seasons: [
      {
        season_id: "cr_season_01_wake",
        season_root_profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
      },
      {
        season_id: "example_city_season_01",
        season_root_profile_id: null,
      },
    ],
  };

  it("returns season_id when profile matches one season root", () => {
    expect(seasonIdForStewardEntitlementsQuery(index, "GcP3Ee17yGqMHdidhEVMYBzq")).toBe(
      "cr_season_01_wake"
    );
  });

  it("returns null when profile is not a season root", () => {
    expect(seasonIdForStewardEntitlementsQuery(index, "7Xk9mP2nQ4rT6vW8yZ1aB3cD5")).toBeNull();
  });

  it("returns null when profile missing", () => {
    expect(seasonIdForStewardEntitlementsQuery(index, "")).toBeNull();
  });

  it("returns null when multiple seasons share the same root (misconfig)", () => {
    const dup = {
      seasons: [
        { season_id: "a", season_root_profile_id: "sameRoot" },
        { season_id: "b", season_root_profile_id: "sameRoot" },
      ],
    };
    expect(seasonIdForStewardEntitlementsQuery(dup, "sameRoot")).toBeNull();
  });
});
