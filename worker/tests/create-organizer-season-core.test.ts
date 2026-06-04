import { describe, expect, it } from "vitest";

import {
  GAME_SEASON_SETUP_FOCUS,
  createdGameSeasonSetupHref,
  gameSeasonBlocksDeviceUnlock,
  gameSeasonRootManifesto,
  gameSeasonSubmitButtonLabel,
  isGameSeasonCreateIntent,
  isGameSeasonCustodySession,
  isGameSeasonSetupFocus,
  parseGameSeasonIdField,
  resolveGameSeasonSubmitStrategy,
  walletEntryHasOrganizerIssuerKey,
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
  it("redirects when a season root with organizer key exists", () => {
    expect(
      resolveGameSeasonSubmitStrategy({
        searchParams: new URLSearchParams("intent=game"),
        walletEntries: [
          {
            pilot_template: "general",
            profile_id: "p1",
            owner_private_key_b58: "priv",
            issuer_public_key: "org_pub",
          },
        ],
      })
    ).toBe("redirect_live");
  });

  it("creates season root when only a deploy general root exists", () => {
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
    ).toBe("create_season_root");
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

describe("gameSeasonBlocksDeviceUnlock", () => {
  it("blocks for intent=game and season custody sessions", () => {
    expect(gameSeasonBlocksDeviceUnlock({ gameSeasonCreateIntent: true })).toBe(true);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { manifesto_line: "City game season · cr_01 · @demo" },
      })
    ).toBe(true);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { pilot_template: "general", issuer_public_key: "org" },
      })
    ).toBe(true);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { pilot_template: "general", manifesto_line: "My deploy card" },
      })
    ).toBe(false);
  });
});

describe("walletEntryHasOrganizerIssuerKey", () => {
  it("detects issuer or organizer public key", () => {
    expect(walletEntryHasOrganizerIssuerKey({ issuer_public_key: "abc" })).toBe(true);
    expect(walletEntryHasOrganizerIssuerKey({ organizer_public_key_b58: "xyz" })).toBe(true);
    expect(walletEntryHasOrganizerIssuerKey({ pilot_template: "general" })).toBe(false);
  });
});

describe("isGameSeasonCustodySession", () => {
  it("detects season manifesto prefix", () => {
    expect(
      isGameSeasonCustodySession({ manifesto_line: "City game season · s1 · @a" })
    ).toBe(true);
  });
});
