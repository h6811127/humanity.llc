import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  wallet: [] as Record<string, unknown>[],
  handoff: vi.fn(async () => undefined),
  writeHandoff: vi.fn(),
  markSeasonKeyHonestBeatPending: vi.fn(),
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: () => mocks.wallet,
}));

vi.mock("../../site/js/create-live-handoff.mjs", () => ({
  handoffToCreatedForWalletEntry: (...args: unknown[]) => mocks.handoff(...args),
}));

vi.mock("../../site/js/create-handoff-core.mjs", () => ({
  buildCreateHandoffPayload: (kind: string, entry: unknown) => ({ kind, entry }),
  writeCreateHandoff: (...args: unknown[]) => mocks.writeHandoff(...args),
}));

vi.mock("../../site/js/steward-season-key-honest-beat-core.mjs", () => ({
  markSeasonKeyHonestBeatPending: (...args: unknown[]) =>
    mocks.markSeasonKeyHonestBeatPending(...args),
}));

import {
  redirectToDeployRootSeasonSetup,
  redirectToGameSeasonSetup,
  runGameSeasonDualSkinCreate,
  runGameSeasonRootCreate,
} from "../../site/js/create-organizer-season-submit.mjs";
import { GAME_SEASON_SETUP_FLOW_KEY } from "../../site/js/create-organizer-season-core.mjs";

function seasonRootEntry(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    qr_id: "qr_seasonRoot01",
    pilot_template: "general",
    owner_private_key_b58: "ownerKey",
    issuer_public_key: "orgKey",
    manifesto_line: "City game season · demo · @river",
    ...overrides,
  };
}

function generalRootEntry(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
    qr_id: "qr_generalRoot01",
    pilot_template: "general",
    owner_private_key_b58: "ownerKey",
    manifesto_line: "Live objects · @river",
    ...overrides,
  };
}

describe("create-organizer-season-submit", () => {
  beforeEach(() => {
    mocks.wallet = [];
    mocks.handoff.mockReset();
    mocks.writeHandoff.mockReset();
    mocks.markSeasonKeyHonestBeatPending.mockReset();
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value));
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: {
        origin: "https://humanity.llc",
        href: "https://humanity.llc/create/?intent=game",
        replace: vi.fn(),
      },
    });
  });

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.sessionStorage;
    // @ts-expect-error restore
    delete globalThis.location;
    vi.clearAllMocks();
  });

  it("redirectToGameSeasonSetup refuses when no season root is saved", async () => {
    mocks.wallet = [generalRootEntry()];
    await expect(redirectToGameSeasonSetup()).rejects.toThrow(
      /No saved season root with organizer key/
    );
    expect(mocks.handoff).not.toHaveBeenCalled();
  });

  it("redirectToGameSeasonSetup writes season handoff and opens Live with room=season", async () => {
    const entry = seasonRootEntry();
    mocks.wallet = [entry];

    await redirectToGameSeasonSetup();

    expect(mocks.writeHandoff).toHaveBeenCalledWith({ kind: "season", entry });
    expect(sessionStorage.getItem(GAME_SEASON_SETUP_FLOW_KEY)).toBe("1");
    expect(mocks.handoff).toHaveBeenCalledWith(
      entry,
      expect.stringMatching(
        /^\/created\/\?profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5&qr_id=qr_seasonRoot01&focus=game-season-setup&room=season$/
      )
    );
  });

  it("redirectToDeployRootSeasonSetup uses preferred general root", async () => {
    const entry = generalRootEntry();
    mocks.wallet = [entry];

    await redirectToDeployRootSeasonSetup();

    expect(mocks.writeHandoff).toHaveBeenCalledWith({ kind: "season", entry });
    expect(mocks.handoff).toHaveBeenCalledWith(
      entry,
      expect.stringContaining("room=season")
    );
  });

  it("runGameSeasonRootCreate navigates to fresh season setup with room=season", async () => {
    const runCreateCard = vi.fn(async () => ({
      session: { scan_url: "https://humanity.llc/c/p?q=qr_new" },
      profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD7",
      qrId: "qr_newSeason01",
    }));

    await runGameSeasonRootCreate({
      handle: "river_studio",
      seasonId: "demo_season_01",
      wantRecovery: false,
      qrValidityDays: 365,
      runCreateCard,
    });

    expect(runCreateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "river_studio",
        navigate: false,
        organizer: { enabled: true, generate: true },
      })
    );
    expect(sessionStorage.getItem(GAME_SEASON_SETUP_FLOW_KEY)).toBe("1");
    expect(location.replace).toHaveBeenCalledWith(
      "/created/?profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD7&qr_id=qr_newSeason01&fresh=1&focus=game-season-setup&room=season"
    );
  });

  it("runGameSeasonDualSkinCreate marks honest-beat and uses general manifesto", async () => {
    const runCreateCard = vi.fn(async (input: Record<string, unknown>) => {
      expect(String(input.manifesto)).not.toMatch(/^City game season/);
      return {
        session: {},
        profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD8",
        qrId: "qr_dualSkin01",
      };
    });

    await runGameSeasonDualSkinCreate({
      handle: "river_studio",
      wantRecovery: true,
      qrValidityDays: 30,
      runCreateCard,
    });

    expect(mocks.markSeasonKeyHonestBeatPending).toHaveBeenCalledWith(
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD8"
    );
    expect(location.replace).toHaveBeenCalledWith(
      expect.stringContaining("room=season")
    );
  });
});
