import { describe, expect, it } from "vitest";

import {
  bindQuietTabRehydrateBootstrap,
  resetQuietTabRehydrateBootstrapForTests,
  shouldAwaitQuietRehydrateBootstrap,
} from "../../site/js/device-quiet-tab-rehydrate-boot-core.mjs";

describe("shouldAwaitQuietRehydrateBootstrap", () => {
  it("includes shell pages that read tab session at module init", () => {
    expect(shouldAwaitQuietRehydrateBootstrap("/created/")).toBe(true);
    expect(shouldAwaitQuietRehydrateBootstrap("/wallet/")).toBe(true);
    expect(shouldAwaitQuietRehydrateBootstrap("/")).toBe(false);
    expect(shouldAwaitQuietRehydrateBootstrap("/c/profile")).toBe(false);
  });
});

describe("bindQuietTabRehydrateBootstrap", () => {
  it("returns the same promise for concurrent callers (RC-10)", async () => {
    resetQuietTabRehydrateBootstrapForTests();
    let runs = 0;
    const first = bindQuietTabRehydrateBootstrap(async () => {
      runs += 1;
      return { ok: true };
    });
    const second = bindQuietTabRehydrateBootstrap(async () => {
      runs += 1;
      return { ok: true };
    });
    expect(first).toBe(second);
    await first;
    expect(runs).toBe(1);
    resetQuietTabRehydrateBootstrapForTests();
  });
});
