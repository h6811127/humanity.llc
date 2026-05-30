import { describe, expect, it } from "vitest";

import {
  detectPwaSessionMismatch,
  parseLastSigningShellMode,
  rememberLastSigningShellMode,
  signingShellModeFromStandalone,
} from "../../site/js/device-pwa-session-mismatch-core.mjs";

describe("device-pwa-session-mismatch-core", () => {
  it("maps standalone display mode to shell mode", () => {
    expect(signingShellModeFromStandalone(true)).toBe("standalone");
    expect(signingShellModeFromStandalone(false)).toBe("browser");
  });

  it("detects mismatch when wallet has keys but tab is empty in another shell", () => {
    expect(
      detectPwaSessionMismatch({
        standalone: true,
        hasTabSigningKeys: false,
        walletSigningKeyCount: 1,
        lastSigningShellMode: "browser",
      })
    ).toEqual({
      lastMode: "browser",
      currentMode: "standalone",
      canRestoreInThisTab: true,
    });

    expect(
      detectPwaSessionMismatch({
        standalone: false,
        hasTabSigningKeys: false,
        walletSigningKeyCount: 2,
        lastSigningShellMode: "standalone",
      })
    ).toEqual({
      lastMode: "standalone",
      currentMode: "browser",
      canRestoreInThisTab: false,
    });
  });

  it("returns null when tab already has keys or modes match", () => {
    expect(
      detectPwaSessionMismatch({
        standalone: true,
        hasTabSigningKeys: true,
        walletSigningKeyCount: 1,
        lastSigningShellMode: "browser",
      })
    ).toBeNull();
    expect(
      detectPwaSessionMismatch({
        standalone: false,
        hasTabSigningKeys: false,
        walletSigningKeyCount: 1,
        lastSigningShellMode: "browser",
      })
    ).toBeNull();
  });

  it("parses last signing shell mode values", () => {
    expect(parseLastSigningShellMode("standalone")).toBe("standalone");
    expect(parseLastSigningShellMode("browser")).toBe("browser");
    expect(parseLastSigningShellMode("invalid")).toBeNull();
    expect(parseLastSigningShellMode(null)).toBeNull();
  });

  it("rememberLastSigningShellMode ignores invalid modes", () => {
    expect(() => rememberLastSigningShellMode("invalid")).not.toThrow();
  });
});
