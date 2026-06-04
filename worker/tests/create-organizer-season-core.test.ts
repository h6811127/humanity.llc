import { describe, expect, it } from "vitest";

import {
  GAME_SEASON_SETUP_FOCUS,
  createdGameSeasonSetupHref,
  gameSeasonRootManifesto,
  gameSeasonSubmitButtonLabel,
  isGameSeasonCreateIntent,
  isGameSeasonSetupFocus,
  parseGameSeasonIdField,
  resolveGameSeasonSubmitStrategy,
} from "../../site/js/create-organizer-season-core.mjs";

describe("isGameSeasonCreateIntent", () => {
  it("detects intent=game", () => {
    expect(isGameSeasonCreateIntent(new URLSearchParams("intent=game"))).toBe(true);
    expect(isGameSeasonCreateIntent(new URLSearchParams("intent=deploy"))).toBe(false);
  });
});

describe("isGameSeasonSetupFocus", () => {
  it("detects focus query and hash", () => {
    expect(isGameSeasonSetupFocus("focus=game-season-setup")).toBe(true);
    expect(isGameSeasonSetupFocus("", "#game-season-setup")).toBe(true);
    expect(isGameSeasonSetupFocus("focus=deploy")).toBe(false);
  });
});

describe("resolveGameSeasonSubmitStrategy", () => {
  it("redirects when a general root with keys exists", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams("intent=game"),
        walletEntries: [
          {
            pilot_template: "general",
            profile_id: "p1",
            owner_private_key_b58: "priv",
          },
        ],
      })
    ).toBe("redirect_live");
  });

  it("creates season root when no saved general root", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams("intent=game"),
        walletEntries: [],
      })
    ).toBe("create_season_root");
  });
});

describe("createdGameSeasonSetupHref", () => {
  it("builds /created/ handoff with focus param", () => {
    const href = createdGameSeasonSetupHref(
      { profile_id: "prof1", qr_id: "qr1" },
      "https://humanity.llc",
      { fresh: true }
    );
    expect(href).toContain("/created/?");
    expect(href).toContain("profile_id=prof1");
    expect(href).toContain("qr_id=qr1");
    expect(href).toContain(`focus=${GAME_SEASON_SETUP_FOCUS}`);
    expect(href).toContain("fresh=1");
  });
});

describe("gameSeasonRootManifesto", () => {
  it("includes season id and handle", () => {
    expect(gameSeasonRootManifesto("river_studio", "cr_season_02")).toContain("cr_season_02");
    expect(gameSeasonRootManifesto("river_studio", "cr_season_02")).toContain("@river_studio");
  });
});

describe("parseGameSeasonIdField", () => {
  it("validates slug", () => {
    expect(parseGameSeasonIdField("my_city_01")).toBe("my_city_01");
    expect(() => parseGameSeasonIdField("Bad Season")).toThrow();
  });
});

describe("gameSeasonSubmitButtonLabel", () => {
  it("labels redirect and create paths", () => {
    expect(gameSeasonSubmitButtonLabel("redirect_live")).toContain("Continue");
    expect(gameSeasonSubmitButtonLabel("create_season_root")).toContain("Create season root");
  });
});
