import { describe, expect, it } from "vitest";

import {
  autoSaveToggleSub,
  browserNotifEnabledFromStorage,
  browserNotifTogglePressed,
  browserNotifToggleSub,
  devicePrefsFromStorage,
  isDevicePrefsBootReady,
  quietTabRehydrateToggleSub,
  resolverSyncToggleSub,
  shouldHideDevicePrefsUntilBoot,
  themeFromStorage,
  themeToggleSub,
} from "../../site/js/device-prefs-boot-core.mjs";

describe("devicePrefsFromStorage", () => {
  it("defaults auto-save and resolver sync on when keys missing", () => {
    const prefs = devicePrefsFromStorage({});
    expect(prefs.autoSaveOn).toBe(true);
    expect(prefs.resolverSyncOn).toBe(true);
    expect(prefs.quietTabRehydrateOn).toBe(true);
    expect(prefs.browserNotifOn).toBe(false);
    expect(prefs.theme).toBe("light");
  });

  it("reads explicit off values", () => {
    const prefs = devicePrefsFromStorage({
      autoSave: "0",
      resolverSync: "0",
      quietTabRehydrate: "0",
      browserNotif: "on",
      theme: "dark",
    });
    expect(prefs.autoSaveOn).toBe(false);
    expect(prefs.resolverSyncOn).toBe(false);
    expect(prefs.quietTabRehydrateOn).toBe(false);
    expect(prefs.browserNotifOn).toBe(true);
    expect(prefs.theme).toBe("dark");
  });
});

describe("toggle copy helpers", () => {
  it("browser notif pressed only when on and granted", () => {
    expect(browserNotifTogglePressed(true, "granted")).toBe(true);
    expect(browserNotifTogglePressed(true, "default")).toBe(false);
    expect(browserNotifTogglePressed(false, "granted")).toBe(false);
  });

  it("browser notif sub reflects permission", () => {
    expect(browserNotifToggleSub(false, "default")).toContain("works best when installed");
    expect(browserNotifToggleSub(false, "default", { standalone: true })).toContain("tap to allow");
    expect(browserNotifToggleSub(true, "granted")).toContain("On");
    expect(browserNotifToggleSub(true, "denied")).toContain("Blocked");
    expect(browserNotifToggleSub(false, "unsupported")).toContain("Not supported");
  });

  it("resolver and auto-save subs flip with on state", () => {
    expect(resolverSyncToggleSub(true)).toContain("On");
    expect(resolverSyncToggleSub(false)).toContain("Off");
    expect(autoSaveToggleSub(true)).toContain("On");
    expect(autoSaveToggleSub(false)).toContain("Off");
    expect(quietTabRehydrateToggleSub(false)).toContain("Off");
  });

  it("theme sub follows storage", () => {
    expect(themeFromStorage("dark")).toBe("dark");
    expect(themeToggleSub("dark")).toContain("Dark");
    expect(browserNotifEnabledFromStorage("on")).toBe(true);
  });
});

describe("prefs boot gate", () => {
  it("hides until ready", () => {
    expect(shouldHideDevicePrefsUntilBoot(undefined)).toBe(true);
    expect(shouldHideDevicePrefsUntilBoot("pending")).toBe(true);
    expect(isDevicePrefsBootReady("ready")).toBe(true);
    expect(shouldHideDevicePrefsUntilBoot("ready")).toBe(false);
  });
});
