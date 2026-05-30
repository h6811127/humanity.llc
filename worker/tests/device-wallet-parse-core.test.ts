import { describe, expect, it } from "vitest";

import { classifyWalletStorageRaw } from "../../site/js/device-wallet-parse-core.mjs";

describe("classifyWalletStorageRaw", () => {
  it("treats missing storage as empty", () => {
    expect(classifyWalletStorageRaw(null).kind).toBe("empty");
    expect(classifyWalletStorageRaw("").kind).toBe("empty");
  });

  it("parses valid wallet arrays", () => {
    const result = classifyWalletStorageRaw('[{"profile_id":"abc"}]');
    expect(result.kind).toBe("ok");
    expect(result.entries).toHaveLength(1);
  });

  it("flags non-array JSON as corrupt", () => {
    expect(classifyWalletStorageRaw('{"profile_id":"abc"}').kind).toBe("corrupt");
  });

  it("flags invalid JSON as corrupt", () => {
    expect(classifyWalletStorageRaw("{not-json").kind).toBe("corrupt");
  });
});

describe("saveWallet corrupt guard (P1-4)", () => {
  it("refuses to overwrite corrupt hc_wallet with a normalized empty array", async () => {
    const wallet = await import("../../site/js/device-wallet.mjs");
    const storage = new Map<string, string>();
    storage.set("hc_wallet", "{not-json");
    const ls = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    };
    // @ts-expect-error test stub
    globalThis.localStorage = ls;
    wallet.loadWallet();
    expect(wallet.isWalletStorageCorrupt()).toBe(true);
    const result = wallet.saveWallet([]);
    expect(result.error).toMatch(/could not be read/i);
    expect(storage.get("hc_wallet")).toBe("{not-json");
  });
});
