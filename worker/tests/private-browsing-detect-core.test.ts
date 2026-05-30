import { describe, expect, it } from "vitest";

import {
  isEphemeralBrowsingStorage,
  isLocalStorageEphemeral,
  probeStorageWritable,
  STORAGE_PROBE_KEY,
} from "../../site/js/private-browsing-detect-core.mjs";

function mockStorage(behavior: "ok" | "throw" | "mismatch" | "null") {
  if (behavior === "null") return null;
  const map = new Map<string, string>();
  return {
    setItem(key: string, value: string) {
      if (behavior === "throw") throw new DOMException("QuotaExceededError");
      map.set(key, value);
    },
    getItem(key: string) {
      if (behavior === "mismatch") return "0";
      return map.get(key) ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("probeStorageWritable (RC-6)", () => {
  it("passes when write/read/remove round-trip", () => {
    expect(probeStorageWritable(mockStorage("ok"))).toEqual({ ok: true });
  });

  it("fails on throw, mismatch, or missing storage", () => {
    expect(probeStorageWritable(mockStorage("throw"))).toEqual({
      ok: false,
      reason: "write_failed",
    });
    expect(probeStorageWritable(mockStorage("mismatch"))).toEqual({
      ok: false,
      reason: "readback_mismatch",
    });
    expect(probeStorageWritable(mockStorage("null"))).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("exports stable probe key", () => {
    expect(STORAGE_PROBE_KEY).toBe("__hc_storage_probe__");
  });
});

describe("isEphemeralBrowsingStorage (RC-6)", () => {
  it("returns false when local and session storage are writable", () => {
    expect(
      isEphemeralBrowsingStorage({
        localStorage: mockStorage("ok"),
        sessionStorage: mockStorage("ok"),
      })
    ).toBe(false);
  });

  it("returns true when localStorage fails", () => {
    expect(
      isEphemeralBrowsingStorage({
        localStorage: mockStorage("throw"),
        sessionStorage: mockStorage("ok"),
      })
    ).toBe(true);
  });

  it("returns true when sessionStorage fails", () => {
    expect(
      isEphemeralBrowsingStorage({
        localStorage: mockStorage("ok"),
        sessionStorage: mockStorage("throw"),
      })
    ).toBe(true);
  });

  it("isLocalStorageEphemeral ignores session when only local is checked", () => {
    expect(isLocalStorageEphemeral(mockStorage("ok"))).toBe(false);
    expect(isLocalStorageEphemeral(mockStorage("throw"))).toBe(true);
  });
});
