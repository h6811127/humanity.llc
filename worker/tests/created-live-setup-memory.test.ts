import { describe, expect, it } from "vitest";

import {
  liveSetupMemoryKicker,
  resolveLiveSetupMemory,
} from "../../site/js/created-live-setup-memory-core.mjs";

describe("resolveLiveSetupMemory", () => {
  it("maps completion flags to chip states", () => {
    expect(
      resolveLiveSetupMemory({
        walletSaved: true,
        printDone: true,
        testScanDone: false,
        setupComplete: true,
      })
    ).toEqual({ save: true, print: true, test: false, live: true });
  });
});

describe("liveSetupMemoryKicker", () => {
  it("celebrates when all steps are done", () => {
    expect(
      liveSetupMemoryKicker({ save: true, print: true, test: true, live: true })
    ).toBe("You already finished setup");
  });
});
