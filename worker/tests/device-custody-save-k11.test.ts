import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveSessionToWalletWithCustody } from "../../site/js/device-custody-save.mjs";
import { loadWallet, resetWalletCachesForTests, saveWallet } from "../../site/js/device-wallet.mjs";

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
  vi.stubGlobal("CustomEvent", class {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetWalletCachesForTests();
});

describe("saveSessionToWalletWithCustody K11", () => {
  it("does not wipe backup/recovery keys on /created/ sync while re-enroll is pending", async () => {
    saveWallet([
      {
        profile_id: "p1",
        custody_mode: "device_unlock",
        device_unlock_reenroll_pending: true,
        owner_public_key_b58: "pub",
        owner_private_key_b58: "owner-from-backup",
        recovery_private_key_b58: "recovery",
      },
    ]);

    const result = await saveSessionToWalletWithCustody(
      {
        profile_id: "p1",
        owner_public_key_b58: "pub",
        owner_private_key_b58: "owner-from-backup",
        recovery_private_key_b58: "recovery",
        verification: { state: "verified_human", label: "Vouched Human" },
      },
      "Restored card"
    );

    expect(result).toMatchObject({ ok: true });
    const entry = loadWallet().find((row) => row.profile_id === "p1");
    expect(entry?.owner_private_key_b58).toBe("owner-from-backup");
    expect(entry?.recovery_private_key_b58).toBe("recovery");
    expect(entry?.device_unlock_reenroll_pending).toBe(true);
    expect(entry?.custody_mode).toBe("device_unlock");
    expect(entry?.wrapped_owner_key).toBeUndefined();
  });

  it("still strips plaintext when a usable device_unlock wrap exists", async () => {
    const wrap = {
      version: 1,
      credential_id: "cred",
      prf_salt: "salt",
      iv: "iv",
      ciphertext: "cipher",
    };
    saveWallet([
      {
        profile_id: "p1",
        custody_mode: "device_unlock",
        wrapped_owner_key: wrap,
        recovery_private_key_b58: "recovery",
      },
    ]);

    const result = await saveSessionToWalletWithCustody(
      {
        profile_id: "p1",
        owner_public_key_b58: "pub",
        owner_private_key_b58: "owner-unlocked",
        recovery_private_key_b58: "recovery",
      },
      "Wrapped card"
    );

    expect(result).toMatchObject({ ok: true });
    const entry = loadWallet().find((row) => row.profile_id === "p1");
    expect(entry?.owner_private_key_b58).toBeUndefined();
    expect(entry?.recovery_private_key_b58).toBeUndefined();
    expect(entry?.wrapped_owner_key).toEqual(wrap);
    expect(entry?.custody_mode).toBe("device_unlock");
  });
});
