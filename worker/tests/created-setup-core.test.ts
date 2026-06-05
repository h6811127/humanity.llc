import { describe, expect, it } from "vitest";

import {
  setupMinStepIndex,
  setupProgressKicker,
  shouldOmitSetupSaveStep,
  canCompleteSetupWizard,
  setupCompletionBlockedMessage,
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

  it("uses step-count-free kicker copy", () => {
    expect(setupProgressKicker(true)).toBe("Save on this device");
    expect(setupProgressKicker(false)).toBe("Save on this device");
  });

  it("canCompleteSetupWizard requires wallet save and seatbelt (RC-4)", () => {
    expect(
      canCompleteSetupWizard({ walletSaved: true, seatbeltSatisfied: true })
    ).toBe(true);
    expect(
      canCompleteSetupWizard({ walletSaved: false, seatbeltSatisfied: true })
    ).toBe(false);
    expect(
      canCompleteSetupWizard({ walletSaved: true, seatbeltSatisfied: false })
    ).toBe(false);
  });

  it("setupCompletionBlockedMessage prefers wallet save over seatbelt (RC-4)", () => {
    expect(
      setupCompletionBlockedMessage({
        walletSaved: false,
        seatbeltSatisfied: false,
      })
    ).toMatch(/Save your control key/i);
    expect(
      setupCompletionBlockedMessage({
        walletSaved: true,
        seatbeltSatisfied: false,
        seatbeltBlockMessage: "Export backup first.",
      })
    ).toBe("Export backup first.");
    expect(
      setupCompletionBlockedMessage({
        walletSaved: true,
        seatbeltSatisfied: true,
      })
    ).toBe(null);
  });
});
