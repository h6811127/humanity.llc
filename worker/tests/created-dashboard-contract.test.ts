import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("created-dashboard.mjs bootstrap contract", () => {
  it("does not reference undeclared opts (params are destructured)", () => {
    const src = readFileSync(join(root, "site/js/created-dashboard.mjs"), "utf8");
    expect(src).not.toMatch(/\bopts\./);
  });

  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      setTimeout: (fn: () => void) => {
        fn();
        return 1;
      },
      clearTimeout: vi.fn(),
      location: { search: "" },
      matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    vi.stubGlobal("document", {
      getElementById: () => null,
      querySelectorAll: () => [],
      body: { dataset: {} },
    });
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("initCreatedDashboard wires without throwing", async () => {
    const { initCreatedDashboard } = await import("../../site/js/created-dashboard.mjs");
    expect(() =>
      initCreatedDashboard({
        selectTab: () => {},
        getProfileId: () => "profile-test",
        getSession: () => ({}),
        hasSigningKeys: () => true,
      })
    ).not.toThrow();
  });
});
