import { describe, expect, it } from "vitest";

import {
  shouldShowCreatedOwnershipSaveUi,
  shouldShowSessionOnlyOwnershipWarning,
  tabNoticeCountFromOwnershipState,
} from "../../site/js/device-ownership-notice-core.mjs";

describe("shouldShowSessionOnlyOwnershipWarning", () => {
  it("is false when tab has no control or ownership is saved", () => {
    expect(
      shouldShowSessionOnlyOwnershipWarning({
        hasTabControl: false,
        savedOnDevice: false,
      })
    ).toBe(false);
    expect(
      shouldShowSessionOnlyOwnershipWarning({
        hasTabControl: true,
        savedOnDevice: true,
      })
    ).toBe(false);
  });

  it("is false on auto-save happy path (unsaved but auto-save on, no failure)", () => {
    expect(
      shouldShowSessionOnlyOwnershipWarning({
        hasTabControl: true,
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(false);
  });

  it("is true when auto-save is off or failed", () => {
    expect(
      shouldShowSessionOnlyOwnershipWarning({
        hasTabControl: true,
        savedOnDevice: false,
        autoSaveEnabled: false,
      })
    ).toBe(true);
    expect(
      shouldShowSessionOnlyOwnershipWarning({
        hasTabControl: true,
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: true,
      })
    ).toBe(true);
  });
});

describe("tabNoticeCountFromOwnershipState", () => {
  it("returns 1 only when a session-only warning should show", () => {
    expect(
      tabNoticeCountFromOwnershipState({
        hasTabControl: true,
        savedOnDevice: false,
        autoSaveEnabled: false,
      })
    ).toBe(1);
    expect(
      tabNoticeCountFromOwnershipState({
        hasTabControl: true,
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(0);
  });
});

describe("shouldShowCreatedOwnershipSaveUi", () => {
  it("shows done state when saved", () => {
    expect(
      shouldShowCreatedOwnershipSaveUi({
        savedOnDevice: true,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(true);
  });

  it("hides manual save UI during quiet auto-save", () => {
    expect(
      shouldShowCreatedOwnershipSaveUi({
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: false,
      })
    ).toBe(false);
  });

  it("shows manual save UI when auto-save is off or failed", () => {
    expect(
      shouldShowCreatedOwnershipSaveUi({
        savedOnDevice: false,
        autoSaveEnabled: false,
      })
    ).toBe(true);
    expect(
      shouldShowCreatedOwnershipSaveUi({
        savedOnDevice: false,
        autoSaveEnabled: true,
        autoSaveFailed: true,
      })
    ).toBe(true);
  });
});
