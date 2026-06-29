import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  persistSeasonWhenId,
  readSeasonWhenId,
} from "../../site/js/created-season-when-panel-core.mjs";

describe("created season when panel", () => {
  /** @type {Map<string, string>} */
  let session;

  beforeEach(() => {
    session = new Map();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key) => session.get(key) ?? null,
        setItem: (key, value) => {
          session.set(key, value);
        },
        removeItem: (key) => {
          session.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    delete globalThis.sessionStorage;
  });

  it("persists normalized season id per profile", () => {
    const profileId = "profile_when_test";
    const seasonId = persistSeasonWhenId(profileId, "my_season_01");
    expect(seasonId).toBe("my_season_01");
    expect(readSeasonWhenId(profileId)).toBe("my_season_01");
  });

  it("rejects invalid season id slugs", () => {
    expect(() => persistSeasonWhenId("p2", "bad slug!")).toThrow();
  });

  it("clears remembered season id for the profile", async () => {
    const { clearSeasonWhenId } = await import(
      "../../site/js/created-season-when-panel-core.mjs"
    );
    persistSeasonWhenId("p3", "my_season_01");
    clearSeasonWhenId("p3");
    expect(readSeasonWhenId("p3")).toBe("");
  });
});
