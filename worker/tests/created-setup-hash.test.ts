import { describe, expect, it } from "vitest";

import { setupStepIndexFromHash } from "../../site/js/created-setup-hash.mjs";

describe("setupStepIndexFromHash", () => {
  it("maps setup wizard hashes to step indices", () => {
    expect(setupStepIndexFromHash("#setup")).toBe(0);
    expect(setupStepIndexFromHash("setup-qr")).toBe(1);
    expect(setupStepIndexFromHash("#setup-test")).toBe(2);
    expect(setupStepIndexFromHash("setup-done")).toBe(3);
  });

  it("returns null for unknown hashes", () => {
    expect(setupStepIndexFromHash("#deploy-print")).toBeNull();
    expect(setupStepIndexFromHash("")).toBeNull();
  });
});
