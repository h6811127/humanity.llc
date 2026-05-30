/**
 * P0-3 wallet save error handling (R3).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WALLET_SAVE_FAILED,
  WALLET_SAVE_STORAGE_FULL,
  WALLET_SAVE_VERIFY_FAILED,
  verifyWalletStorageWrite,
  walletSaveErrorMessage,
  walletSaveOk,
} from "../../site/js/device-wallet-save-core.mjs";
import { STORAGE_PROBE_KEY } from "../../site/js/private-browsing-detect-core.mjs";
import {
  loadWallet,
  resetWalletCachesForTests,
  saveSessionToWallet,
  saveWallet,
} from "../../site/js/device-wallet.mjs";

let localStore: Map<string, string>;

beforeEach(() => {
  localStore = new Map();
  resetWalletCachesForTests();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => localStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStore.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      localStore.delete(key);
    }),
  });
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("Event", class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetWalletCachesForTests();
});

describe("device-wallet-save-core", () => {
  it("maps QuotaExceededError to storage-full copy", () => {
    const err = new DOMException("quota", "QuotaExceededError");
    expect(walletSaveErrorMessage(err)).toBe(WALLET_SAVE_STORAGE_FULL);
    expect(walletSaveErrorMessage({ name: "QuotaExceededError" })).toBe(
      WALLET_SAVE_STORAGE_FULL
    );
  });

  it("maps other errors to generic save failure copy", () => {
    expect(walletSaveErrorMessage(new Error("SecurityError"))).toBe(WALLET_SAVE_FAILED);
  });

  it("walletSaveOk discriminates success results", () => {
    expect(walletSaveOk({ ok: true })).toBe(true);
    expect(walletSaveOk({ error: WALLET_SAVE_FAILED })).toBe(false);
  });

  it("verifyWalletStorageWrite requires exact read-back (RC-1)", () => {
    const store = new Map([["hc_wallet", '[{"profile_id":"p1"}]']]);
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
    };
    expect(
      verifyWalletStorageWrite(storage, "hc_wallet", '[{"profile_id":"p1"}]')
    ).toBe(true);
    expect(
      verifyWalletStorageWrite(storage, "hc_wallet", '[{"profile_id":"p2"}]')
    ).toBe(false);
    expect(verifyWalletStorageWrite(storage, "hc_wallet", "")).toBe(false);
    expect(verifyWalletStorageWrite(null, "hc_wallet", "x")).toBe(false);
  });
});

describe("saveWallet P0-3", () => {
  it("returns error without mutating cache when localStorage.setItem throws", () => {
    const entry = {
      profile_id: "p1",
      qr_id: "qr_xBZTq7M27tueCzBY",
      owner_private_key_b58: "priv",
    };
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      if (key === STORAGE_PROBE_KEY) {
        localStore.set(String(key), String(value));
        return;
      }
      throw new DOMException("quota", "QuotaExceededError");
    });

    const result = saveWallet([entry]);
    expect(result).toEqual({ error: WALLET_SAVE_STORAGE_FULL });
    expect(loadWallet()).toEqual([]);
    expect(localStore.has("hc_wallet")).toBe(false);
  });

  it("saveSessionToWallet propagates saveWallet errors", () => {
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      if (key === STORAGE_PROBE_KEY) {
        localStore.set(String(key), String(value));
        return;
      }
      throw new DOMException("quota", "QuotaExceededError");
    });

    const result = saveSessionToWallet({
      profile_id: "p1",
      owner_private_key_b58: "priv",
      owner_public_key_b58: "pub",
      handle: "demo",
    });
    expect(result).toEqual({ error: WALLET_SAVE_STORAGE_FULL });
  });

  it("returns verify error when setItem succeeds but read-back is empty (RC-1)", () => {
    const entry = {
      profile_id: "p1",
      qr_id: "qr_xBZTq7M27tueCzBY",
      owner_private_key_b58: "priv",
    };
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      if (key === STORAGE_PROBE_KEY) {
        localStore.set(String(key), String(value));
      }
    });
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === "hc_wallet") return null;
      return localStore.get(String(key)) ?? null;
    });

    const result = saveWallet([entry]);
    expect(result).toEqual({ error: WALLET_SAVE_VERIFY_FAILED });
    expect(loadWallet()).toEqual([]);
  });

  it("returns verify error when read-back bytes differ (RC-1)", () => {
    const entry = {
      profile_id: "p1",
      qr_id: "qr_xBZTq7M27tueCzBY",
      owner_private_key_b58: "priv",
    };
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      localStore.set(String(key), String(value));
    });
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === "hc_wallet") return "[]";
      return localStore.get(String(key)) ?? null;
    });

    const result = saveWallet([entry]);
    expect(result).toEqual({ error: WALLET_SAVE_VERIFY_FAILED });
    expect(loadWallet()).toEqual([]);
  });

  it("returns ephemeral error when localStorage probe fails (RC-6)", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    const result = saveWallet([
      {
        profile_id: "p1",
        qr_id: "qr_xBZTq7M27tueCzBY",
        owner_private_key_b58: "priv",
      },
    ]);
    expect(result.error).toMatch(/private browsing/i);
  });
});
