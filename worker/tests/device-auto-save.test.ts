import { describe, expect, it } from "vitest";

import { autoSaveEnabledFromStorage } from "../../site/js/device-auto-save.mjs";

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
