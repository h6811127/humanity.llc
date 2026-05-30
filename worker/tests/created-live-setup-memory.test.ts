import { describe, expect, it } from "vitest";

import {
  liveSetupMemoryKicker,
  resolveLiveSetupMemory,
} from "../../site/js/created-live-setup-memory-core.mjs";

describe("resolveLiveSetupMemory", () => {
  it("maps completion flags to chip states including protect", () => {
    expect(
      resolveLiveSetupMemory({
        walletSaved: true,
        printDone: true,
        testScanDone: false,
        protectDone: true,
        setupComplete: true,
      })
    ).toEqual({ save: true, print: true, test: false, protect: true, live: true });
  });
});

describe("liveSetupMemoryKicker", () => {
  it("celebrates when all five steps are done", () => {
    expect(
      liveSetupMemoryKicker({
        save: true,
        print: true,
        test: true,
        protect: true,
        live: true,
      })
    ).toBe("You already finished setup");
  });
});
