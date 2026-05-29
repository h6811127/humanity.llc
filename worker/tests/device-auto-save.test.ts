import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  autoSaveEnabledFromStorage,
  clearAutoSaveFailed,
  isAutoSaveFailed,
  markAutoSaveFailed,
} from "../../site/js/device-auto-save.mjs";

describe("autoSaveEnabledFromStorage", () => {
  it("is on when preference is unset (default)", () => {
    expect(autoSaveEnabledFromStorage(null)).toBe(true);
  });

  it("is on when explicitly set to 1", () => {
    expect(autoSaveEnabledFromStorage("1")).toBe(true);
  });

  it("is off only when set to 0", () => {
    expect(autoSaveEnabledFromStorage("0")).toBe(false);
  });
});

describe("auto-save failure tracking", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it("marks and clears per profile", () => {
    expect(isAutoSaveFailed("p1")).toBe(false);
    markAutoSaveFailed("p1");
    expect(isAutoSaveFailed("p1")).toBe(true);
    expect(isAutoSaveFailed("p2")).toBe(false);
    clearAutoSaveFailed("p1");
    expect(isAutoSaveFailed("p1")).toBe(false);
  });
});
