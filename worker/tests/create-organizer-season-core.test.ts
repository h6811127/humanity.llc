import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GAME_SEASON_SETUP_FOCUS,
  clearGameSeasonSetupFlow,
  createdGameSeasonSetupHref,
  gameSeasonBlocksDeviceUnlock,
  gameSeasonRootManifesto,
  isGameSeasonCreateIntent,
  isGameSeasonCustodySession,
  isGameSeasonSetupFlowActive,
  isGameSeasonSetupFocus,
  markGameSeasonSetupFlow,
  parseGameSeasonIdField,
  pickPreferredGameSeasonRoot,
  readRememberedGameSeasonId,
  rememberGameSeasonIdForProfile,
  walletEntryHasOrganizerIssuerKey,
} from "../../site/js/create-organizer-season-core.mjs";

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  return store;
}

beforeEach(() => {
  stubSessionStorage();
});

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

describe("gameSeasonBlocksDeviceUnlock", () => {
  it("blocks for intent=game and season custody sessions", () => {
    expect(gameSeasonBlocksDeviceUnlock({ gameSeasonCreateIntent: true })).toBe(true);
    expect(gameSeasonBlocksDeviceUnlock({ setupFlowActive: true })).toBe(true);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { manifesto_line: "City game season · cr_01 · @demo" },
      })
    ).toBe(true);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { pilot_template: "general", issuer_public_key: "org" },
      })
    ).toBe(false);
    expect(
      gameSeasonBlocksDeviceUnlock({
        session: { pilot_template: "general", manifesto_line: "My deploy card" },
      })
    ).toBe(false);
  });
});

describe("game season setup flow flag", () => {
  it("round-trips the setup-flow marker for device unlock gating", () => {
    expect(isGameSeasonSetupFlowActive()).toBe(false);
    markGameSeasonSetupFlow();
    expect(isGameSeasonSetupFlowActive()).toBe(true);
    clearGameSeasonSetupFlow();
    expect(isGameSeasonSetupFlowActive()).toBe(false);
  });
});

describe("remembered game season id", () => {
  it("round-trips season ids scoped by profile id", () => {
    rememberGameSeasonIdForProfile("prof_a", "cr_season_01");
    rememberGameSeasonIdForProfile("prof_b", "cr_season_02");

    expect(readRememberedGameSeasonId("prof_a")).toBe("cr_season_01");
    expect(readRememberedGameSeasonId("prof_b")).toBe("cr_season_02");
    expect(readRememberedGameSeasonId("")).toBe("");
  });

  it("does not write without both profile id and season id", () => {
    const store = stubSessionStorage();
    rememberGameSeasonIdForProfile("", "cr_season_01");
    rememberGameSeasonIdForProfile("prof_a", "");
    expect(store.size).toBe(0);
  });
});

describe("walletEntryHasOrganizerIssuerKey", () => {
  it("detects issuer or organizer public key", () => {
    expect(walletEntryHasOrganizerIssuerKey({ issuer_public_key: "abc" })).toBe(true);
    expect(walletEntryHasOrganizerIssuerKey({ organizer_public_key_b58: "xyz" })).toBe(true);
    expect(walletEntryHasOrganizerIssuerKey({ pilot_template: "general" })).toBe(false);
  });
});

describe("pickPreferredGameSeasonRoot", () => {
  const deployRootWithIssuer = {
    pilot_template: "general",
    profile_id: "p_deploy",
    owner_private_key_b58: "priv_deploy",
    issuer_public_key: "coalition_pub",
    manifesto_line: "Live objects · @river_studio",
  };

  const seasonRoot = {
    pilot_template: "general",
    profile_id: "p_season",
    owner_private_key_b58: "priv_season",
    organizer_public_key_b58: "org_pub",
    manifesto_line: "City game season · cr_season_01 · @river_studio",
  };

  it("prefers a saved City game season root over deploy roots with issuer keys", () => {
    expect(pickPreferredGameSeasonRoot([deployRootWithIssuer, seasonRoot])).toBe(seasonRoot);
  });

  it("does not treat deploy-style issuer roots as season setup roots", () => {
    expect(pickPreferredGameSeasonRoot([deployRootWithIssuer])).toBeNull();
  });
});

describe("isGameSeasonCustodySession", () => {
  it("detects season manifesto prefix", () => {
    expect(
      isGameSeasonCustodySession({ manifesto_line: "City game season · s1 · @a" })
    ).toBe(true);
  });

  it("does not treat coalition revoke issuer key as season custody", () => {
    expect(
      isGameSeasonCustodySession({
        pilot_template: "general",
        manifesto_line: "Live objects · @river_studio",
        issuer_public_key: "org",
      })
    ).toBe(false);
  });
});
