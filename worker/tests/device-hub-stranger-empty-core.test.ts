import { describe, expect, it } from "vitest";
import {
  HUB_STRANGER_EMPTY_CLASS,
  isHubStrangerEmptyState,
  isLandingHomePath,
  isLandingStrangerChrome,
  LANDING_STRANGER_CHROME_CLASS,
} from "../../site/js/device-hub-stranger-empty-core.mjs";

describe("device-hub-stranger-empty-core", () => {
  it("is true only when wallet, pins, and inbox actions are all zero", () => {
    expect(isHubStrangerEmptyState({})).toBe(true);
    expect(isHubStrangerEmptyState({ walletCount: 0, pinCount: 0, inboxActionCount: 0 })).toBe(
      true
    );
    expect(isHubStrangerEmptyState({ walletCount: 1 })).toBe(false);
    expect(isHubStrangerEmptyState({ pinCount: 1 })).toBe(false);
    expect(isHubStrangerEmptyState({ inboxActionCount: 1 })).toBe(false);
    expect(
      isHubStrangerEmptyState({
        walletCount: 0,
        pinCount: 0,
        inboxActionCount: 0,
        walletCorrupt: true,
      })
    ).toBe(false);
  });

  it("detects landing home path", () => {
    expect(isLandingHomePath("/")).toBe(true);
    expect(isLandingHomePath("/index.html")).toBe(true);
    expect(isLandingHomePath("/create/")).toBe(false);
    expect(isLandingHomePath("/wallet/")).toBe(false);
  });

  it("landing stranger chrome requires home path and empty device state", () => {
    expect(
      isLandingStrangerChrome({
        pathname: "/",
        walletCount: 0,
        pinCount: 0,
        inboxActionCount: 0,
      })
    ).toBe(true);
    expect(
      isLandingStrangerChrome({
        pathname: "/create/",
        walletCount: 0,
        pinCount: 0,
        inboxActionCount: 0,
      })
    ).toBe(false);
    expect(
      isLandingStrangerChrome({
        pathname: "/",
        walletCount: 1,
        pinCount: 0,
        inboxActionCount: 0,
      })
    ).toBe(false);
  });

  it("exports stable root class names", () => {
    expect(HUB_STRANGER_EMPTY_CLASS).toBe("device-hub--stranger-empty");
    expect(LANDING_STRANGER_CHROME_CLASS).toBe("landing-stranger-chrome");
  });

  it("exports restore-always attribute for import groups", async () => {
    const { HUB_RESTORE_ALWAYS_ATTR } = await import(
      "../../site/js/device-hub-stranger-empty-core.mjs"
    );
    expect(HUB_RESTORE_ALWAYS_ATTR).toBe("data-hub-restore-always");
  });
});

describe("device-status landing stranger chrome wiring", () => {
  it("device-status applies landing stranger chrome and keeps hub collapsed on init", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const statusSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-status.mjs"),
      "utf8"
    );
    const statusCoreSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-status-core.mjs"),
      "utf8"
    );
    expect(statusSrc).toContain("applyLandingStrangerChrome");
    expect(statusSrc).toContain("LANDING_STRANGER_CHROME_CLASS");
    expect(statusCoreSrc).toContain('sessionStorage.setItem(HUB_OPEN_KEY, "0")');
    expect(statusCoreSrc).toContain("setHubExpanded(false, { persist: false })");
    expect(statusSrc).toContain("strangerLanding");
  });
});
