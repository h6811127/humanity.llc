import { describe, expect, it } from "vitest";

import {
  setupMinStepIndex,
  setupProgressKicker,
  shouldOmitSetupSaveStep,
} from "../../site/js/created-setup-core.mjs";

describe("created-setup-core", () => {
  it("omits save step when auto-save already persisted ownership", () => {
    expect(
      shouldOmitSetupSaveStep({
        savedOnDevice: true,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(true);
  });

  it("keeps save step when auto-save failed or disabled", () => {
    expect(
      shouldOmitSetupSaveStep({
        savedOnDevice: true,
        autoSaveEnabled: true,
        autoSaveFailed: true,
      })
    ).toBe(false);
    expect(
      shouldOmitSetupSaveStep({
        savedOnDevice: true,
        autoSaveEnabled: false,
        autoSaveFailed: false,
      })
    ).toBe(false);
    expect(
      shouldOmitSetupSaveStep({
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(false);
  });

  it("raises min step index when save is omitted", () => {
    expect(setupMinStepIndex(true)).toBe(1);
    expect(setupMinStepIndex(false)).toBe(0);
  });

  it("uses four-step kicker when save is omitted (5-step wizard with protect)", () => {
    expect(setupProgressKicker(true)).toMatch(/4 steps/);
    expect(setupProgressKicker(false)).toMatch(/5 steps/);
  });
});
