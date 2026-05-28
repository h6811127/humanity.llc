import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_E2eWakketTest9";

describe("device wallet compact index", () => {
  /** @type {Map<string, string>} */
  let localStore;

  beforeEach(() => {
    localStore = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => {
        localStore.set(key, String(value));
      },
      removeItem: (key) => {
        localStore.delete(key);
      },
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("answers shell count/profile hot paths from hc_wallet_index without hydrating hc_wallet", async () => {
    let mod = await import("../../site/js/device-wallet.mjs");
    mod.saveWallet([
      {
        id: "w1",
        profile_id: PROFILE,
        qr_id: QR,
        owner_private_key_b58: "owner-private",
        verification: { state: "steward", label: "Steward" },
      },
    ]);
    const walletRaw = localStore.get(mod.WALLET_STORAGE_KEY);

    vi.resetModules();
    mod = await import("../../site/js/device-wallet.mjs");
    const realParse = JSON.parse;
    vi.spyOn(JSON, "parse").mockImplementation((text, reviver) => {
      if (text === walletRaw) {
        throw new Error("hc_wallet should not be parsed for compact index reads");
      }
      return realParse(text, reviver);
    });

    expect(mod.walletSavedCount()).toBe(1);
    expect(mod.walletPollableCount()).toBe(1);
    expect(mod.walletSigningCount()).toBe(1);
    expect(mod.walletHasStewardSigningKey()).toBe(true);
    expect(mod.isWalletSaved(PROFILE)).toBe(true);
  });

  it("falls back to full wallet hydration when the compact index is missing", async () => {
    const wallet = [
      {
        id: "w1",
        profile_id: PROFILE,
        qr_id: QR,
      },
    ];
    localStore.set("hc_wallet", JSON.stringify(wallet));

    vi.resetModules();
    const mod = await import("../../site/js/device-wallet.mjs");

    expect(mod.walletSavedCount()).toBe(1);
    expect(mod.walletPollableCount()).toBe(1);
    expect(localStore.get(mod.WALLET_INDEX_STORAGE_KEY)).toContain(PROFILE);
  });
});
